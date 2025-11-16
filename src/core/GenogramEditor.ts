import type {
    Shape,
    Line,
    ShapeType,
    PlaceableShapeType,
    LineStyle,
    LineColorName,
    EditorMode,
    GenogramData,
    GenogramEditorOptions
} from './types';
import { LINE_COLORS } from './types';
import { GenogramRenderer } from './renderer';

/**
 * ジェノグラムエディタのコアクラス
 */
export class GenogramEditor extends EventTarget {
    // データ保持
    private shapes: Shape[] = [];
    private lines: Line[] = [];

    // エディタ状態
    private mode: EditorMode = 'add';
    private selectedShapeType: PlaceableShapeType = 'square';
    private lineStyle: LineStyle = 'normal';
    private lineColor: string = LINE_COLORS.black;
    private currentAge: string = '';
    private lineStart: string | { x: number; y: number } | null = null;

    // レンダラー
    private renderer: GenogramRenderer;
    private canvas: SVGSVGElement;
    private gridSize: number;

    constructor(canvas: SVGSVGElement, options: GenogramEditorOptions = {}) {
        super();
        this.canvas = canvas;
        this.gridSize = options.gridSize || 30;
        this.renderer = new GenogramRenderer(canvas);
        this.setupEventListeners();
    }

    // ============================================
    // イベントリスナー設定
    // ============================================
    private setupEventListeners(): void {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    private handleCanvasClick(e: MouseEvent): void {
        const target = e.target as SVGElement;

        // 図形や線をクリックした場合は各ハンドラへ
        if (target.dataset.shapeId || target.dataset.lineId) {
            return;
        }

        // クリック位置をグリッドにスナップ
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / this.gridSize) * this.gridSize;
        const y = Math.round((e.clientY - rect.top) / this.gridSize) * this.gridSize;

        if (this.mode === 'add') {
            this.addShape(x, y, this.selectedShapeType);
        } else if (this.mode === 'line') {
            this.handleLineMode(x, y);
        }
    }

    private handleLineMode(x: number, y: number): void {
        if (!this.lineStart) {
            // 1回目: 開始点設定
            this.lineStart = { x, y };
            this.renderer.renderTempPoint(x, y);
        } else {
            // 2回目: 線作成
            if (typeof this.lineStart === 'object') {
                this.addFreeLine(this.lineStart.x, this.lineStart.y, x, y);
            }
            this.lineStart = null;
            this.render();
        }
    }

    // ============================================
    // 図形操作
    // ============================================
    public addShape(x: number, y: number, type: ShapeType = this.selectedShapeType): string {
        const shape: Shape = {
            id: `shape-${Date.now()}-${Math.random()}`,
            type,
            x,
            y,
            age: this.currentAge || undefined
        };
        this.shapes.push(shape);
        this.render();
        this.dispatchEvent(new CustomEvent('shapeAdd', { detail: shape }));
        this.notifyChange();
        return shape.id;
    }

    public deleteShape(shapeId: string): void {
        const shape = this.shapes.find(s => s.id === shapeId);
        if (!shape) return;

        // junction削除の特別処理
        if (shape.type === 'junction') {
            this.handleJunctionDeletion(shapeId);
            return;
        }

        // 通常の図形削除
        this.shapes = this.shapes.filter(s => s.id !== shapeId);
        this.lines = this.lines.filter(l => l.startId !== shapeId && l.endId !== shapeId);
        this.cleanupJunctions();
        this.render();
        this.dispatchEvent(new CustomEvent('shapeDelete', { detail: shapeId }));
        this.notifyChange();
    }

    private handleJunctionDeletion(shapeId: string): void {
        const connectedLines = this.lines.filter(l => l.startId === shapeId || l.endId === shapeId);

        if (connectedLines.length === 3) {
            // 子要素の線を特定
            const childLine = connectedLines.find(l => {
                const otherLines = connectedLines.filter(ol => ol.id !== l.id);
                const otherEndpoints = otherLines.flatMap(ol =>
                    [ol.startId, ol.endId].filter(id => id !== shapeId)
                );
                const thisEndpoint = l.startId === shapeId ? l.endId : l.startId;
                return !otherEndpoints.includes(thisEndpoint);
            });

            const horizontalLines = connectedLines.filter(l => l.id !== childLine?.id);

            // 水平線を1本に統合
            if (horizontalLines.length === 2 && childLine) {
                const endpoint1 = horizontalLines[0].startId === shapeId
                    ? horizontalLines[0].endId
                    : horizontalLines[0].startId;
                const endpoint2 = horizontalLines[1].startId === shapeId
                    ? horizontalLines[1].endId
                    : horizontalLines[1].startId;

                if (endpoint1 && endpoint2) {
                    this.shapes = this.shapes.filter(s => s.id !== shapeId);
                    this.lines = this.lines.filter(l => !connectedLines.map(cl => cl.id).includes(l.id));
                    this.addLine(endpoint1, endpoint2);
                    this.render();
                    return;
                }
            }
        }

        // デフォルトの削除処理
        this.shapes = this.shapes.filter(s => s.id !== shapeId);
        this.lines = this.lines.filter(l => l.startId !== shapeId && l.endId !== shapeId);
        this.cleanupJunctions();
        this.render();
    }

    private cleanupJunctions(): void {
        const shapesToRemove: string[] = [];
        const linesToRemove: string[] = [];
        const linesToAdd: Line[] = [];

        this.shapes.forEach(s => {
            if (s.type === 'junction') {
                const connectedLines = this.lines.filter(l => l.startId === s.id || l.endId === s.id);

                if (connectedLines.length <= 2) {
                    shapesToRemove.push(s.id);
                    linesToRemove.push(...connectedLines.map(l => l.id));

                    if (connectedLines.length === 2) {
                        const endpoint1 = connectedLines[0].startId === s.id
                            ? connectedLines[0].endId
                            : connectedLines[0].startId;
                        const endpoint2 = connectedLines[1].startId === s.id
                            ? connectedLines[1].endId
                            : connectedLines[1].startId;

                        if (endpoint1 && endpoint2) {
                            linesToAdd.push({
                                id: `line-${Date.now()}-${s.id}`,
                                startId: endpoint1,
                                endId: endpoint2,
                                style: this.lineStyle,
                                color: this.lineColor
                            });
                        }
                    }
                }
            }
        });

        this.shapes = this.shapes.filter(s => !shapesToRemove.includes(s.id));
        this.lines = this.lines.filter(l => !linesToRemove.includes(l.id));
        this.lines.push(...linesToAdd);
    }

    // ============================================
    // 線操作
    // ============================================
    public addLine(startId: string, endId: string): string {
        const line: Line = {
            id: `line-${Date.now()}-${Math.random()}`,
            startId,
            endId,
            style: this.lineStyle,
            color: this.lineColor
        };
        this.lines.push(line);
        this.render();
        this.dispatchEvent(new CustomEvent('lineAdd', { detail: line }));
        this.notifyChange();
        return line.id;
    }

    public addFreeLine(startX: number, startY: number, endX: number, endY: number): string {
        const line: Line = {
            id: `line-${Date.now()}-${Math.random()}`,
            startX,
            startY,
            endX,
            endY,
            style: this.lineStyle,
            color: this.lineColor
        };
        this.lines.push(line);
        this.render();
        this.dispatchEvent(new CustomEvent('lineAdd', { detail: line }));
        this.notifyChange();
        return line.id;
    }

    public addMixedLine(
        start: string | { x: number; y: number },
        end: string | { x: number; y: number }
    ): string {
        const line: Line = {
            id: `line-${Date.now()}-${Math.random()}`,
            style: this.lineStyle,
            color: this.lineColor
        };

        if (typeof start === 'string') {
            line.startId = start;
        } else {
            line.startX = start.x;
            line.startY = start.y;
        }

        if (typeof end === 'string') {
            line.endId = end;
        } else {
            line.endX = end.x;
            line.endY = end.y;
        }

        this.lines.push(line);
        this.render();
        this.dispatchEvent(new CustomEvent('lineAdd', { detail: line }));
        this.notifyChange();
        return line.id;
    }

    public deleteLine(lineId: string): void {
        const line = this.lines.find(l => l.id === lineId);
        if (!line) return;

        const startShape = this.shapes.find(s => s.id === line.startId);
        const endShape = this.shapes.find(s => s.id === line.endId);

        let junctionId: string | null = null;
        if (startShape?.type === 'junction') {
            junctionId = startShape.id;
        } else if (endShape?.type === 'junction') {
            junctionId = endShape.id;
        }

        if (junctionId) {
            const connectedLines = this.lines.filter(l => l.startId === junctionId || l.endId === junctionId);
            this.lines = this.lines.filter(l => !connectedLines.map(cl => cl.id).includes(l.id));
            this.shapes = this.shapes.filter(s => s.id !== junctionId);

            if (connectedLines.length === 3) {
                const otherLines = connectedLines.filter(l => l.id !== lineId);
                const endpoints = otherLines.flatMap(l =>
                    [l.startId, l.endId].filter(id => id !== junctionId)
                );

                const validEndpoints = endpoints.filter((id): id is string => id !== undefined);
                if (validEndpoints.length === 2) {
                    this.addLine(validEndpoints[0], validEndpoints[1]);
                }
            }
        } else {
            this.lines = this.lines.filter(l => l.id !== lineId);
        }

        this.render();
        this.dispatchEvent(new CustomEvent('lineDelete', { detail: lineId }));
        this.notifyChange();
    }

    public createTJunction(shapeId: string, lineId: string): void {
        const line = this.lines.find(l => l.id === lineId);
        if (!line || !line.startId || !line.endId) return;

        const startShape = this.shapes.find(s => s.id === line.startId);
        const endShape = this.shapes.find(s => s.id === line.endId);
        if (!startShape || !endShape) return;

        // 中点にjunction配置
        const midX = Math.round((startShape.x + endShape.x) / 2 / this.gridSize) * this.gridSize;
        const midY = Math.round((startShape.y + endShape.y) / 2 / this.gridSize) * this.gridSize;

        const junctionId = this.addShape(midX, midY, 'junction');

        // 元の線のスタイルを保持
        const originalStyle = line.style;
        const originalColor = line.color;

        this.lines = this.lines.filter(l => l.id !== lineId);

        const tempStyle = this.lineStyle;
        const tempColor = this.lineColor;

        this.lineStyle = originalStyle;
        this.lineColor = originalColor;

        this.addLine(line.startId, junctionId);
        this.addLine(junctionId, line.endId);

        this.lineStyle = tempStyle;
        this.lineColor = tempColor;

        this.addLine(shapeId, junctionId);
    }

    // ============================================
    // 設定系メソッド
    // ============================================
    public setMode(mode: EditorMode): void {
        this.mode = mode;
        this.lineStart = null;
        this.dispatchEvent(new CustomEvent('modeChange', { detail: mode }));
    }

    public setSelectedShapeType(type: PlaceableShapeType): void {
        this.selectedShapeType = type;
    }

    public setLineStyle(style: LineStyle): void {
        this.lineStyle = style;
    }

    public setLineColor(colorName: LineColorName): void {
        this.lineColor = LINE_COLORS[colorName];
    }

    public setAge(age: string): void {
        this.currentAge = age;
    }

    // ============================================
    // データ取得・操作
    // ============================================
    public getData(): GenogramData {
        return {
            shapes: [...this.shapes],
            lines: [...this.lines]
        };
    }

    public loadData(data: GenogramData): void {
        this.shapes = [...data.shapes];
        this.lines = [...data.lines];
        this.render();
        this.notifyChange();
    }

    public clear(): void {
        this.shapes = [];
        this.lines = [];
        this.lineStart = null;
        this.render();
        this.notifyChange();
    }

    public exportJSON(): string {
        return JSON.stringify(this.getData(), null, 2);
    }

    public importJSON(json: string): void {
        const data = JSON.parse(json) as GenogramData;
        this.loadData(data);
    }

    // ============================================
    // レンダリング
    // ============================================
    private render(): void {
        this.renderer.clear();

        // 線を先に描画
        this.lines.forEach(line => {
            const lineElement = this.renderer.renderLine(
                line,
                this.shapes,
                (lineId) => this.handleLineClick(lineId)
            );
            this.renderer.appendChild(lineElement);
        });

        // 図形を描画
        this.shapes.forEach(shape => {
            const shapeElement = this.renderer.renderShape(
                shape,
                (shapeId) => this.handleShapeClick(shapeId)
            );
            this.renderer.appendChild(shapeElement);
        });
    }

    private handleShapeClick(shapeId: string): void {
        const shape = this.shapes.find(s => s.id === shapeId);
        if (!shape) return;

        if (this.mode === 'delete') {
            this.deleteShape(shapeId);
        } else if (this.mode === 'line') {
            // junctionとslashは接続不可
            if (shape.type === 'junction' || shape.type === 'slash') return;

            if (!this.lineStart) {
                this.lineStart = shapeId;
            } else {
                if (typeof this.lineStart === 'string') {
                    if (this.lineStart !== shapeId) {
                        this.addLine(this.lineStart, shapeId);
                    }
                } else {
                    this.addMixedLine(this.lineStart, shapeId);
                }
                this.lineStart = null;
                this.render();
            }
        }
    }

    private handleLineClick(lineId: string): void {
        if (this.mode === 'delete') {
            this.deleteLine(lineId);
        } else if (this.mode === 'line') {
            const line = this.lines.find(l => l.id === lineId);
            if (!line) return;

            // 線の中点を使用
            const { startX, startY, endX, endY } = this.getLineCoordinates(line);
            if (startX === null || endX === null) return;

            if (!this.lineStart) {
                const midX = Math.round((startX + endX) / 2 / this.gridSize) * this.gridSize;
                const midY = Math.round((startY! + endY!) / 2 / this.gridSize) * this.gridSize;
                this.lineStart = { x: midX, y: midY };
                this.renderer.renderTempPoint(midX, midY);
            } else if (typeof this.lineStart === 'string') {
                this.createTJunction(this.lineStart, lineId);
                this.lineStart = null;
            }
        }
    }

    // 線の座標を取得するヘルパー
    private getLineCoordinates(line: Line): {
        startX: number | null;
        startY: number | null;
        endX: number | null;
        endY: number | null
    } {
        let startX: number | null = null;
        let startY: number | null = null;
        let endX: number | null = null;
        let endY: number | null = null;

        if (line.startId) {
            const startShape = this.shapes.find(s => s.id === line.startId);
            if (startShape) {
                startX = startShape.x;
                startY = startShape.y;
            }
        } else if (line.startX !== undefined && line.startY !== undefined) {
            startX = line.startX;
            startY = line.startY;
        }

        if (line.endId) {
            const endShape = this.shapes.find(s => s.id === line.endId);
            if (endShape) {
                endX = endShape.x;
                endY = endShape.y;
            }
        } else if (line.endX !== undefined && line.endY !== undefined) {
            endX = line.endX;
            endY = line.endY;
        }

        return { startX, startY, endX, endY };
    }

    // ============================================
    // イベント発行
    // ============================================
    private notifyChange(): void {
        this.dispatchEvent(new CustomEvent('change', { detail: this.getData() }));
    }

    // ============================================
    // クリーンアップ
    // ============================================
    public destroy(): void {
        // イベントリスナーの削除などのクリーンアップ処理
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.renderer.clear();
    }
}
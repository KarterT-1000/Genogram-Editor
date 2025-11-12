// ============================================
// インターフェース定義
// ============================================

/**
 * ---------------------------------------------
 * 図形の定義
 * square: 四角形（男性）
 * circle: 円（女性）
 * triangle: 三角形
 * diamond: ひし形
 * junction: 接続点（T字接続用の小さな点）
 * slash: 二重斜線記号（//）
 * ---------------------------------------------
 */
export interface Shape {
    id: string;
    type: 'square' | 'circle' | 'triangle' | 'diamond' | 'junction' | 'slash';
    x: number;
    y: number;
    age?: string;
}
export type ShapeType = Shape['type'];
export type PlaceableShapeType = Exclude<ShapeType, 'junction'>;

/**
 * ---------------------------------------------
 * 線の定義
 * startId/endId: 図形に接続する場合のID
 * startX/startY/endX/endY: フリーライン（図形に接続しない）の場合の座標
 * style: 線のスタイル（通常/二重線/波線）
 * color: 線の色
 * ---------------------------------------------
 */
export interface Line {
    id: string;
    startId?: string;
    endId?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    style?: 'normal' | 'double' | 'wave';
    color?: string;
}

export type LineStyle = NonNullable<Line['style']>;

/**
 * ---------------------------------------------
 * エディタのモード
 * add: 図形配置モード
 * delete: 削除モード
 * line: 線描画モード（図形接続＋フリーライン統合）
 * ---------------------------------------------
 */
export type Mode = 'add' | 'delete' | 'line';

/**
 * ジェノグラムデータ全体
 */
export interface GenogramData {
    shapes: Shape[];
    lines: Line[];
}

// // --------------------------------------------------------------------------------
// GenogramEditorクラス
// // --------------------------------------------------------------------------------

export class GenogramEditor {
    // データ保持用の配列
    private shapes: Shape[] = [];  // すべての図形
    private lines: Line[] = [];    // すべての線

    // エディタの状態
    private selectedShapeType: PlaceableShapeType = 'square';  // 選択中の図形タイプ
    private mode: Mode = 'add';  // 現在のモード
    private lineStart: string | { x: number; y: number } | null = null;  // 線描画の開始点（図形IDまたは座標）
    private lineStyle: LineStyle = 'normal';  // 現在選択中の線スタイル
    private lineColor: string = '#1F2937';  // 現在選択中の線の色

    // SVGキャンバス関連
    private canvas: SVGSVGElement;
    private gridSize: number = 30;  // グリッドのサイズ（スナップ用）

    /**
     * コンストラクタ
     * @param canvasId SVGキャンバスのID
     */
    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !(canvas instanceof SVGSVGElement)) {
            throw new Error(`SVG Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;
        this.initializeCanvas();
        this.setupEventListeners();
    }

    /**
     * ---------------------------------------------
     * キャンバスの初期化（背景グリッドの描画）
     * ---------------------------------------------
     */
    private initializeCanvas(): void {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'grid');
        pattern.setAttribute('width', '30');
        pattern.setAttribute('height', '30');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // 縦と横の線を描く
        line.setAttribute('d', 'M 30 0 L 0 0 0 30');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', '#ccc');
        line.setAttribute('stroke-width', '1');

        pattern.appendChild(line);
        defs.appendChild(pattern);
        this.canvas.appendChild(defs);

        // 背景に適用
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', 'url(#grid)');
        this.canvas.appendChild(rect);
    }

    /**
     * ---------------------------------------------
     * イベントリスナーのセットアップ
     * ---------------------------------------------
     */
    private setupEventListeners(): void {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    /**
     * ---------------------------------------------
     * キャンバスクリック時の処理
     * @param e マウスイベント
     * ---------------------------------------------
     */
    private handleCanvasClick(e: MouseEvent): void {
        const target = e.target as SVGElement;

        // 図形や線をクリックした場合は何もしない（それぞれのイベントハンドラが処理）
        if (target.dataset.shapeId || target.dataset.lineId) {
            return;
        }

        // クリック位置をグリッドにスナップ
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const snappedX = Math.round(x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(y / this.gridSize) * this.gridSize;

        // モードに応じた処理
        if (this.mode === 'add') {
            // 配置モード: 図形を追加
            this.addShape(snappedX, snappedY, this.selectedShapeType);
        } else if (this.mode === 'line') {
            // 線描画モード
            if (!this.lineStart) {
                // 1回目のクリック: 開始点を設定
                this.lineStart = { x: snappedX, y: snappedY };
                this.renderTempPoint(snappedX, snappedY);
            } else {
                // 2回目のクリック: 線を作成
                if (typeof this.lineStart === 'object') {
                    // フリーポイントからフリーポイントへの線
                    this.addFreeLine(
                        this.lineStart.x,
                        this.lineStart.y,
                        snappedX,
                        snappedY
                    );
                }
                this.lineStart = null;
                this.render();
            }
        }
    }

    /**
     * ---------------------------------------------
     * 図形を追加
     * @param x X座標
     * @param y Y座標
     * @param type 図形タイプ
     * @returns 追加した図形のID
     * ---------------------------------------------
     */

    // ====================
    // 年齢
    // ====================
    private currentAge: string = '';
    public setAge(age: string): void {
        this.currentAge = age;
    }

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
        return shape.id;
    }

    /**
     * 図形を削除
     * @param shapeId 削除する図形のID
     */
    public deleteShape(shapeId: string): void {
        const shape = this.shapes.find(s => s.id === shapeId);
        if (!shape) return;

        // junction（接続点）の削除時の特別処理
        if (shape.type === 'junction') {
            const connectedLines = this.lines.filter(l => l.startId === shapeId || l.endId === shapeId);

            // 3本の線が接続されているjunctionの場合
            if (connectedLines.length === 3) {
                // 子要素の線を見つける（他の2本の線と接続していない端点を持つ線）
                const childLine = connectedLines.find(l => {
                    const otherLines = connectedLines.filter(ol => ol.id !== l.id);
                    const otherEndpoints = otherLines.flatMap(ol =>
                        [ol.startId, ol.endId].filter(id => id !== shapeId)
                    );
                    const thisEndpoint = l.startId === shapeId ? l.endId : l.startId;
                    return !otherEndpoints.includes(thisEndpoint);
                });

                // 水平線（親の線）を見つける
                const horizontalLines = connectedLines.filter(l => l.id !== childLine?.id);

                // junction削除後、水平線を1本に統合
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
        }

        // 通常の図形削除: 図形と接続されている線をすべて削除
        this.shapes = this.shapes.filter(s => s.id !== shapeId);
        this.lines = this.lines.filter(l => l.startId !== shapeId && l.endId !== shapeId);

        // 不要になったjunctionをクリーンアップ
        this.cleanupJunctions();
        this.render();
    }

    /**
     * -------------------------------------------------------
     * 不要なjunction（接続点）のクリーンアップ
     * 2本以下の線しか接続していないjunctionを削除し、線を統合
     * -------------------------------------------------------
     */
    private cleanupJunctions(): void {
        const shapesToRemove: string[] = [];
        const linesToRemove: string[] = [];
        const linesToAdd: Line[] = [];

        this.shapes.forEach(s => {
            if (s.type === 'junction') {
                const connectedLines = this.lines.filter(l => l.startId === s.id || l.endId === s.id);

                // 2本以下の線しか接続していないjunctionは不要
                if (connectedLines.length <= 2) {
                    shapesToRemove.push(s.id);
                    linesToRemove.push(...connectedLines.map(l => l.id));

                    // 2本の線の場合は統合
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

    /**
     * -------------------------------------------------------
     * 図形間の線を追加
     * @param startId 開始図形のID
     * @param endId 終了図形のID
     * @returns 追加した線のID
     * -------------------------------------------------------
     */
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
        return line.id;
    }

    /**
     * -------------------------------------------------------
     * 混合線を追加（図形と座標、または座標同士の組み合わせ）
     * @param start 開始点（図形IDまたは座標）
     * @param end 終了点（図形IDまたは座標）
     * @returns 追加した線のID
     * -------------------------------------------------------
     */
    public addMixedLine(
        start: string | { x: number; y: number },
        end: string | { x: number; y: number }
    ): string {
        const line: Line = {
            id: `line-${Date.now()}-${Math.random()}`,
            style: this.lineStyle,
            color: this.lineColor
        };

        // 開始点の設定
        if (typeof start === 'string') {
            line.startId = start;
        } else {
            line.startX = start.x;
            line.startY = start.y;
        }

        // 終了点の設定
        if (typeof end === 'string') {
            line.endId = end;
        } else {
            line.endX = end.x;
            line.endY = end.y;
        }

        this.lines.push(line);
        this.render();
        return line.id;
    }

    /**
     * -------------------------------------------------------
     * フリーライン（座標指定の線）を追加
     * @param startX 開始X座標
     * @param startY 開始Y座標
     * @param endX 終了X座標
     * @param endY 終了Y座標
     * @returns 追加した線のID
     * -------------------------------------------------------
     */
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
        return line.id;
    }

    /**
     * -------------------------------------------------------
     * 線のスタイルを設定
     * @param style 線のスタイル
     * -------------------------------------------------------
     */
    public setLineStyle(style: LineStyle): void {
        this.lineStyle = style;
    }

    /**
     * -------------------------------------------------------
     * 線の色を設定
     * @param color 線の色（CSSカラー文字列）
     * -------------------------------------------------------
     */
    public setLineColor(color: string): void {
        this.lineColor = color;
    }

    /**
     * -------------------------------------------------------
     * 線を削除
     * @param lineId 削除する線のID
     * -------------------------------------------------------
     */
    public deleteLine(lineId: string): void {
        const line = this.lines.find(l => l.id === lineId);
        if (!line) return;

        const startShape = this.shapes.find(s => s.id === line.startId);
        const endShape = this.shapes.find(s => s.id === line.endId);

        // 接続点（junction）を含む線の削除処理
        let junctionId: string | null = null;
        if (startShape?.type === 'junction') {
            junctionId = startShape.id;
        } else if (endShape?.type === 'junction') {
            junctionId = endShape.id;
        }

        if (junctionId) {
            // junction関連の線をすべて削除
            const connectedLines = this.lines.filter(l => l.startId === junctionId || l.endId === junctionId);
            this.lines = this.lines.filter(l => !connectedLines.map(cl => cl.id).includes(l.id));
            this.shapes = this.shapes.filter(s => s.id !== junctionId);

            // 3本接続の場合、残りの2本の端点を接続
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
            // 通常の線削除
            this.lines = this.lines.filter(l => l.id !== lineId);
        }

        this.render();
    }

    /**
     * -------------------------------------------------------
     * T字接続（junction）を作成
     * @param shapeId 接続する図形のID
     * @param lineId 接続先の線のID
     * -------------------------------------------------------
     */
    public createTJunction(shapeId: string, lineId: string): void {
        const line = this.lines.find(l => l.id === lineId);
        if (!line || !line.startId || !line.endId) return;

        const startShape = this.shapes.find(s => s.id === line.startId);
        const endShape = this.shapes.find(s => s.id === line.endId);
        if (!startShape || !endShape) return;

        // 線の中点にjunctionを配置
        const midX = (startShape.x + endShape.x) / 2;
        const midY = (startShape.y + endShape.y) / 2;
        const snappedX = Math.round(midX / this.gridSize) * this.gridSize;
        const snappedY = Math.round(midY / this.gridSize) * this.gridSize;

        const junctionId = this.addShape(snappedX, snappedY, 'junction');

        // 元の線のスタイルと色を保持
        const originalStyle = line.style;
        const originalColor = line.color;

        // 元の線を削除
        this.lines = this.lines.filter(l => l.id !== lineId);

        // 現在のスタイル・色を一時保存
        const tempStyle = this.lineStyle;
        const tempColor = this.lineColor;

        // 元の線と同じスタイル・色で分割した線を作成
        this.lineStyle = originalStyle || 'normal';
        this.lineColor = originalColor || '#1F2937';

        this.addLine(line.startId, junctionId);
        this.addLine(junctionId, line.endId);

        // スタイル・色を戻して新しい接続線を作成
        this.lineStyle = tempStyle;
        this.lineColor = tempColor;

        this.addLine(shapeId, junctionId);
    }

    /**
     * -------------------------------------------------------
     * モードを設定
     * @param mode エディタのモード
     * -------------------------------------------------------
     */
    public setMode(mode: Mode): void {
        this.mode = mode;
        this.lineStart = null;
    }

    /**
     * -------------------------------------------------------
     * 選択中の図形タイプを設定
     * @param type 図形タイプ
     * -------------------------------------------------------
     */
    public setSelectedShapeType(type: PlaceableShapeType): void {
        this.selectedShapeType = type;
    }

    /**
     * -------------------------------------------------------
     * 現在のモードを取得
     * @returns 現在のモード
     * -------------------------------------------------------
     */
    public getMode(): Mode {
        return this.mode;
    }

    /**
     * -------------------------------------------------------
     * ジェノグラムデータを取得
     * @returns ジェノグラムデータ
     * -------------------------------------------------------
     */
    public getData(): GenogramData {
        return {
            shapes: [...this.shapes],
            lines: [...this.lines]
        };
    }

    /**
     * -------------------------------------------------------
     * ジェノグラムデータを読み込み
     * @param data ジェノグラムデータ
     * -------------------------------------------------------
     */
    public loadData(data: GenogramData): void {
        this.shapes = [...data.shapes];
        this.lines = [...data.lines];
        this.render();
    }

    /**
     * -------------------------------------------------------
     * JSON形式でエクスポート
     * @returns JSON文字列
     * -------------------------------------------------------
     */
    public exportJSON(): string {
        return JSON.stringify(this.getData(), null, 2);
    }

    /**
     * -------------------------------------------------------
     * JSON形式でインポート
     * @param json JSON文字列
     * -------------------------------------------------------
     */
    public importJSON(json: string): void {
        const data = JSON.parse(json) as GenogramData;
        this.loadData(data);
    }

    /**
     * -------------------------------------------------------
     * キャンバスを再描画
     * すべての図形と線を削除してから再描画
     * -------------------------------------------------------
     */
    private render(): void {
        // 既存の図形と線を削除（グリッドとdefs以外）
        while (this.canvas.children.length > 2) {
            this.canvas.removeChild(this.canvas.lastChild!);
        }

        // ================================================================================
        // 線の描画
        // ================================================================================
        this.lines.forEach(line => {
            let startX: number, startY: number, endX: number, endY: number;

            // 開始点の座標を取得
            if (line.startId) {
                // 図形IDから座標を取得
                const startShape = this.shapes.find(s => s.id === line.startId);
                if (!startShape) return;
                startX = startShape.x;
                startY = startShape.y;
            } else if (line.startX !== undefined && line.startY !== undefined) {
                // 直接座標指定
                startX = line.startX;
                startY = line.startY;
            } else {
                return;
            }

            // 終了点の座標を取得
            if (line.endId) {
                // 図形IDから座標を取得
                const endShape = this.shapes.find(s => s.id === line.endId);
                if (!endShape) return;
                endX = endShape.x;
                endY = endShape.y;
            } else if (line.endX !== undefined && line.endY !== undefined) {
                // 直接座標指定
                endX = line.endX;
                endY = line.endY;
            } else {
                return;
            }

            // 線要素のグループを作成
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.dataset.lineId = line.id;

            const lineColor = line.color || '#1F2937';

            // --------------------------------------------------------------------------------
            // 線のスタイル別描画
            // --------------------------------------------------------------------------------
            if (line.style === 'double') {
                // ================================================================================
                // 二重線の描画波線のスタイル
                // ================================================================================
                const dx = endX - startX;
                const dy = endY - startY;
                const length = Math.sqrt(dx * dx + dy * dy);

                // 線に垂直な方向の単位ベクトル
                const offsetX = -dy / length * 3;
                const offsetY = dx / length * 3;
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', (startX + offsetX).toString());
                line1.setAttribute('y1', (startY + offsetY).toString());
                line1.setAttribute('x2', (endX + offsetX).toString());
                line1.setAttribute('y2', (endY + offsetY).toString());
                line1.setAttribute('stroke', lineColor);
                line1.setAttribute('stroke-width', '2');

                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (startX - offsetX).toString());
                line2.setAttribute('y1', (startY - offsetY).toString());
                line2.setAttribute('x2', (endX - offsetX).toString());
                line2.setAttribute('y2', (endY - offsetY).toString());
                line2.setAttribute('stroke', lineColor);
                line2.setAttribute('stroke-width', '2');

                g.appendChild(line1);
                g.appendChild(line2);

            } else if (line.style === 'wave') {
                // ================================================================================
                // 波線（Sin波）の描画波線のスタイル
                // ================================================================================
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const dx = endX - startX;
                const dy = endY - startY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 波のパラメータ
                const wavelength = 30; // 波長
                const amplitude = 5;   // 振幅
                const segments = Math.max(Math.floor(distance / 3), 30);

                // 線の方向の単位ベクトル
                const unitX = dx / distance;
                const unitY = dy / distance;

                // 垂直方向の単位ベクトル
                const perpX = -unitY;
                const perpY = unitX;

                // パスデータの構築
                let pathData = `M ${startX} ${startY}`;

                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const alongDistance = t * distance;

                    // Sin波の計算
                    const waveOffset = Math.sin((alongDistance / wavelength) * 2 * Math.PI) * amplitude;

                    // 現在の位置
                    const x = startX + unitX * alongDistance + perpX * waveOffset;
                    const y = startY + unitY * alongDistance + perpY * waveOffset;

                    pathData += ` L ${x} ${y}`;
                }

                path.setAttribute('d', pathData);
                path.setAttribute('stroke', lineColor);
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                g.appendChild(path);
            } else {
                // ================================================================================
                // 通常線の描画
                // ================================================================================
                const lineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                lineElement.setAttribute('x1', startX.toString());
                lineElement.setAttribute('y1', startY.toString());
                lineElement.setAttribute('x2', endX.toString());
                lineElement.setAttribute('y2', endY.toString());
                lineElement.setAttribute('stroke', lineColor);
                lineElement.setAttribute('stroke-width', '2');
                g.appendChild(lineElement);
            }

            // --------------------------------------------------------------------------------
            // 線のクリックイベント
            // --------------------------------------------------------------------------------
            g.style.cursor = 'pointer';
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.mode === 'delete') {
                    // 削除モード: 線を削除
                    this.deleteLine(line.id);
                } else if (this.mode === 'line') {
                    // 線描画モード
                    if (!this.lineStart) {
                        // 線の中点をフリーポイントとして使用
                        this.lineStart = { x: (startX + endX) / 2, y: (startY + endY) / 2 };
                        const snappedX = Math.round(this.lineStart.x / this.gridSize) * this.gridSize;
                        const snappedY = Math.round(this.lineStart.y / this.gridSize) * this.gridSize;
                        this.lineStart = { x: snappedX, y: snappedY };
                        this.renderTempPoint(snappedX, snappedY);
                    } else if (typeof this.lineStart === 'string') {
                        // 図形から線へのT字接続
                        this.createTJunction(this.lineStart, line.id);
                        this.lineStart = null;
                    }
                }
            });

            this.canvas.appendChild(g);
        });

        // --------------------------------------------------------------------------------
        // 図形の描画
        // --------------------------------------------------------------------------------
        this.shapes.forEach(shape => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.dataset.shapeId = shape.id;
            g.style.cursor = 'pointer';

            const shapeElement = this.createShapeElement(shape);
            g.appendChild(shapeElement);

            // 図形のクリックイベント
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleShapeClick(shape.id);
            });

            this.canvas.appendChild(g);
        });
    }

    /**
     * -------------------------------------------------------
     * 図形のSVG要素を作成
     * @param shape 図形データ
     * @returns SVG要素
     * -------------------------------------------------------
     */
    private createShapeElement(shape: Shape): SVGElement {
        const size = 30;
        const colors = {
            square: '#3B82F6',
            circle: '#EC4899',
            triangle: '#10B981',
            diamond: '#F59E0B'
        };

        // ========================================
        // 各図形タイプの描画
        // ========================================
        switch (shape.type) {
            case 'square': {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                // 四角形（男性）
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', (shape.x - size / 2).toString());
                rect.setAttribute('y', (shape.y - size / 2).toString());
                rect.setAttribute('width', size.toString());
                rect.setAttribute('height', size.toString());
                rect.setAttribute('fill', colors.square);
                rect.setAttribute('opacity', '0.8');
                g.appendChild(rect);
                if (shape.age) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', shape.x.toString());
                    text.setAttribute('y', shape.y.toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('fill', 'white');
                    text.textContent = shape.age;
                    g.appendChild(text);
                }
                return g;
            }
            case 'circle': {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                // 円（女性）
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', shape.x.toString());
                circle.setAttribute('cy', shape.y.toString());
                circle.setAttribute('r', (size / 2).toString());
                circle.setAttribute('fill', colors.circle);
                circle.setAttribute('opacity', '0.8');
                g.appendChild(circle);
                if (shape.age) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', shape.x.toString());
                    text.setAttribute('y', shape.y.toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('fill', 'white');
                    text.textContent = shape.age;
                    g.appendChild(text);
                }
                return g;
            }
            case 'triangle': {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                // 三角形
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const points = `${shape.x},${shape.y - size / 2} ${shape.x - size / 2},${shape.y + size / 2} ${shape.x + size / 2},${shape.y + size / 2}`;
                polygon.setAttribute('points', points);
                polygon.setAttribute('fill', colors.triangle);
                polygon.setAttribute('opacity', '0.8');
                g.appendChild(polygon);
                if (shape.age) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', shape.x.toString());
                    text.setAttribute('y', shape.y.toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('fill', 'black');
                    text.textContent = shape.age;
                    g.appendChild(text);
                }
                return g;
            }
            case 'diamond': {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                // ひし形
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const points = `${shape.x},${shape.y - size / 2} ${shape.x + size / 2},${shape.y} ${shape.x},${shape.y + size / 2} ${shape.x - size / 2},${shape.y}`;
                polygon.setAttribute('points', points);
                polygon.setAttribute('fill', colors.diamond);
                polygon.setAttribute('opacity', '0.8');
                g.appendChild(polygon);
                if (shape.age) {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', shape.x.toString());
                    text.setAttribute('y', shape.y.toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.setAttribute('font-size', '14');
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('fill', 'black');
                    text.textContent = shape.age;
                    g.appendChild(text);
                }
                return g;
            }
            case 'junction': {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', shape.x.toString());
                circle.setAttribute('cy', shape.y.toString());
                circle.setAttribute('r', '5');
                circle.setAttribute('fill', '#000000');
                return circle;
            }
            case 'slash': {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', shape.x.toString());
                text.setAttribute('y', shape.y.toString());
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('font-size', '32');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('fill', '#1F2937');
                text.setAttribute('font-family', 'Arial, sans-serif');
                text.textContent = '//';
                return text;
            }
        }
    }

    /**
     * -------------------------------------------------------
     * 図形クリック時の処理
     * @param shapeId クリックされた図形のID
     * -------------------------------------------------------
     */
    private handleShapeClick(shapeId: string): void {
        const shape = this.shapes.find(s => s.id === shapeId);
        if (!shape) return;

        if (this.mode === 'delete') {
            // 削除モード: 図形を削除
            this.deleteShape(shapeId);
        } else if (this.mode === 'line') {
            // 線描画モード
            // junctionとslashは接続できない
            if (shape.type === 'junction' || shape.type === 'slash') return;

            if (!this.lineStart) {
                // 1回目のクリック: 開始図形を設定
                this.lineStart = shapeId;
            } else {
                // 2回目のクリック: 線を作成
                if (typeof this.lineStart === 'string') {
                    // 図形から図形への接続
                    if (this.lineStart !== shapeId) {
                        this.addLine(this.lineStart, shapeId);
                    }
                } else {
                    // フリーポイントから図形への接続
                    this.addMixedLine(this.lineStart, shapeId);
                }
                this.lineStart = null;
                this.render();
            }
        }
    }

    /**
     * -------------------------------------------------------
     * すべてをクリア
     * -------------------------------------------------------
     */
    public clear(): void {
        this.shapes = [];
        this.lines = [];
        this.lineStart = null;
        this.render();
    }

    /**
     * -------------------------------------------------------
     * 一時的な点を描画（線描画開始点の表示用）
     * @param x X座標
     * @param y Y座標
     * -------------------------------------------------------
     */
    private renderTempPoint(x: number, y: number): void {
        const temp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        temp.setAttribute('cx', x.toString());
        temp.setAttribute('cy', y.toString());
        temp.setAttribute('r', '5');
        temp.setAttribute('fill', '#10B981');
        temp.setAttribute('id', 'temp-point');
        this.canvas.appendChild(temp);
    }
}
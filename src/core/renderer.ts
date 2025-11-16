// renderer.ts - SVG描画ロジック

import type { Shape, Line, RenderConfig } from './types';
import { LINE_COLORS } from './types';

/**
 * SVG描画を担当するクラス
 */
export class GenogramRenderer {
    private canvas: SVGSVGElement;
    private config: RenderConfig;

    constructor(canvas: SVGSVGElement, config?: Partial<RenderConfig>) {
        this.canvas = canvas;
        this.config = {
            shapeSize: 30,
            junctionRadius: 5,
            lineWidth: 3,
            gridColor: '#ccc',
            shapeColors: {
                square: '#3B82F6',
                circle: '#EC4899',
                triangle: '#10B981',
                diamond: '#F59E0B',
                star: '#FFD900'
            },
            ...config
        };
        this.initializeCanvas();
    }

    /**
     * キャンバスの初期化（グリッド、マーカー定義）
     */
    private initializeCanvas(): void {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // グリッドパターン
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'grid');
        pattern.setAttribute('width', '30');
        pattern.setAttribute('height', '30');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', 'M 30 0 L 0 0 0 30');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', this.config.gridColor);
        line.setAttribute('stroke-width', '1');

        pattern.appendChild(line);
        defs.appendChild(pattern);

        // 矢印マーカー（各色ごと）
        Object.values(LINE_COLORS).forEach(color => {
            const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            arrowMarker.setAttribute('id', `arrowhead-${color.replace('#', '')}`);
            arrowMarker.setAttribute('markerWidth', '10');
            arrowMarker.setAttribute('markerHeight', '10');
            arrowMarker.setAttribute('refX', '9');
            arrowMarker.setAttribute('refY', '3');
            arrowMarker.setAttribute('orient', 'auto');

            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
            arrowPath.setAttribute('fill', color);

            arrowMarker.appendChild(arrowPath);
            defs.appendChild(arrowMarker);
        });

        this.canvas.appendChild(defs);

        // 背景グリッド
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', 'url(#grid)');
        this.canvas.appendChild(rect);
    }

    /**
     * キャンバスをクリア（図形と線のみ削除、グリッドは残す）
     */
    public clear(): void {
        while (this.canvas.children.length > 2) {
            this.canvas.removeChild(this.canvas.lastChild!);
        }
    }

    /**
     * 線を描画
     */
    public renderLine(
        line: Line,
        shapes: Shape[],
        onClick?: (lineId: string) => void
    ): SVGGElement {
        const { startX, startY, endX, endY } = this.getLineCoordinates(line, shapes);

        // 座標が取得できない場合は空のグループを返す
        if (startX === null || startY === null || endX === null || endY === null) {
            return document.createElementNS('http://www.w3.org/2000/svg', 'g');
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.dataset.lineId = line.id;
        g.style.cursor = 'pointer';

        const lineColor = line.color || LINE_COLORS.black;

        switch (line.style) {
            case 'double':
                this.renderDoubleLine(g, startX, startY, endX, endY, lineColor);
                break;
            case 'wave':
                this.renderWaveLine(g, startX, startY, endX, endY, lineColor);
                break;
            case 'dotted':
                this.renderDottedLine(g, startX, startY, endX, endY, lineColor);
                break;
            case 'arrow':
                this.renderArrowLine(g, startX, startY, endX, endY, lineColor);
                break;
            default:
                this.renderNormalLine(g, startX, startY, endX, endY, lineColor);
        }

        if (onClick) {
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick(line.id);
            });
        }

        return g;
    }

    /**
     * 線の座標を取得
     */
    private getLineCoordinates(
        line: Line,
        shapes: Shape[]
    ): { startX: number | null; startY: number | null; endX: number | null; endY: number | null } {
        let startX: number | null = null;
        let startY: number | null = null;
        let endX: number | null = null;
        let endY: number | null = null;

        if (line.startId) {
            const startShape = shapes.find(s => s.id === line.startId);
            if (startShape) {
                startX = startShape.x;
                startY = startShape.y;
            }
        } else if (line.startX !== undefined && line.startY !== undefined) {
            startX = line.startX;
            startY = line.startY;
        }

        if (line.endId) {
            const endShape = shapes.find(s => s.id === line.endId);
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

    /**
     * 通常の線を描画
     */
    private renderNormalLine(
        g: SVGGElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string
    ): void {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX.toString());
        line.setAttribute('y1', startY.toString());
        line.setAttribute('x2', endX.toString());
        line.setAttribute('y2', endY.toString());
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', this.config.lineWidth.toString());
        g.appendChild(line);
    }

    /**
     * 二重線を描画
     */
    private renderDoubleLine(
        g: SVGGElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string
    ): void {
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetX = -dy / length * 3;
        const offsetY = dx / length * 3;

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', (startX + offsetX).toString());
        line1.setAttribute('y1', (startY + offsetY).toString());
        line1.setAttribute('x2', (endX + offsetX).toString());
        line1.setAttribute('y2', (endY + offsetY).toString());
        line1.setAttribute('stroke', color);
        line1.setAttribute('stroke-width', '2');

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', (startX - offsetX).toString());
        line2.setAttribute('y1', (startY - offsetY).toString());
        line2.setAttribute('x2', (endX - offsetX).toString());
        line2.setAttribute('y2', (endY - offsetY).toString());
        line2.setAttribute('stroke', color);
        line2.setAttribute('stroke-width', '2');

        g.appendChild(line1);
        g.appendChild(line2);
    }

    /**
     * 波線を描画
     */
    private renderWaveLine(
        g: SVGGElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string
    ): void {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wavelength = 30;
        const amplitude = 5;
        const segments = Math.max(Math.floor(distance / 3), 30);

        const unitX = dx / distance;
        const unitY = dy / distance;
        const perpX = -unitY;
        const perpY = unitX;

        let pathData = `M ${startX} ${startY}`;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const alongDistance = t * distance;
            const waveOffset = Math.sin((alongDistance / wavelength) * 2 * Math.PI) * amplitude;
            const x = startX + unitX * alongDistance + perpX * waveOffset;
            const y = startY + unitY * alongDistance + perpY * waveOffset;
            pathData += ` L ${x} ${y}`;
        }

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', this.config.lineWidth.toString());
        path.setAttribute('fill', 'none');
        g.appendChild(path);
    }

    /**
     * 点線を描画
     */
    private renderDottedLine(
        g: SVGGElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string
    ): void {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX.toString());
        line.setAttribute('y1', startY.toString());
        line.setAttribute('x2', endX.toString());
        line.setAttribute('y2', endY.toString());
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', this.config.lineWidth.toString());
        line.setAttribute('stroke-dasharray', '5,5');
        g.appendChild(line);
    }

    /**
     * 矢印を描画
     */
    private renderArrowLine(
        g: SVGGElement,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string
    ): void {
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 1) return;

        const offset = 15;
        const ratio = (length - offset) / length;
        const adjustedEndX = startX + dx * ratio;
        const adjustedEndY = startY + dy * ratio;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX.toString());
        line.setAttribute('y1', startY.toString());
        line.setAttribute('x2', adjustedEndX.toString());
        line.setAttribute('y2', adjustedEndY.toString());
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', `url(#arrowhead-${color.replace('#', '')})`);
        g.appendChild(line);
    }

    /**
     * 図形を描画
     */
    public renderShape(shape: Shape, onClick?: (shapeId: string) => void): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.dataset.shapeId = shape.id;
        g.style.cursor = 'pointer';

        const shapeElement = this.createShapeElement(shape);
        g.appendChild(shapeElement);

        if (onClick) {
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick(shape.id);
            });
        }

        return g;
    }

    /**
     * 図形要素を作成
     */
    private createShapeElement(shape: Shape): SVGElement {
        const size = this.config.shapeSize;

        switch (shape.type) {
            case 'square':
                return this.createSquare(shape, size);
            case 'circle':
                return this.createCircle(shape, size);
            case 'triangle':
                return this.createTriangle(shape, size);
            case 'diamond':
                return this.createDiamond(shape, size);
            case 'star':
                return this.createStar(shape);
            case 'junction':
                return this.createJunction(shape);
            case 'slash':
                return this.createSlash(shape);
            default:
                return document.createElementNS('http://www.w3.org/2000/svg', 'g');
        }
    }

    private createSquare(shape: Shape, size: number): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', (shape.x - size / 2).toString());
        rect.setAttribute('y', (shape.y - size / 2).toString());
        rect.setAttribute('width', size.toString());
        rect.setAttribute('height', size.toString());
        rect.setAttribute('fill', this.config.shapeColors.square);
        rect.setAttribute('opacity', '0.8');
        g.appendChild(rect);
        if (shape.age) this.addLabel(g, shape, 'white');
        return g;
    }

    private createCircle(shape: Shape, size: number): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', shape.x.toString());
        circle.setAttribute('cy', shape.y.toString());
        circle.setAttribute('r', (size / 2).toString());
        circle.setAttribute('fill', this.config.shapeColors.circle);
        circle.setAttribute('opacity', '0.8');
        g.appendChild(circle);
        if (shape.age) this.addLabel(g, shape, 'white');
        return g;
    }

    private createTriangle(shape: Shape, size: number): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = `${shape.x},${shape.y - size / 2} ${shape.x - size / 2},${shape.y + size / 2} ${shape.x + size / 2},${shape.y + size / 2}`;
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', this.config.shapeColors.triangle);
        polygon.setAttribute('opacity', '0.8');
        g.appendChild(polygon);
        if (shape.age) this.addLabel(g, shape, 'black');
        return g;
    }

    private createDiamond(shape: Shape, size: number): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = `${shape.x},${shape.y - size / 2} ${shape.x + size / 2},${shape.y} ${shape.x},${shape.y + size / 2} ${shape.x - size / 2},${shape.y}`;
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', this.config.shapeColors.diamond);
        polygon.setAttribute('opacity', '0.8');
        g.appendChild(polygon);
        if (shape.age) this.addLabel(g, shape, 'white');
        return g;
    }

    private createStar(shape: Shape): SVGGElement {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const starSize = 40;
        const outerRadius = starSize / 2;
        const innerRadius = outerRadius * 0.4;
        const points: string[] = [];

        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = shape.x + Math.cos(angle) * radius;
            const y = shape.y + Math.sin(angle) * radius;
            points.push(`${x},${y}`);
        }

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        polygon.setAttribute('fill', this.config.shapeColors.star);
        polygon.setAttribute('opacity', '0.8');
        g.appendChild(polygon);
        if (shape.age) this.addLabel(g, shape, 'black');
        return g;
    }

    private createJunction(shape: Shape): SVGCircleElement {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', shape.x.toString());
        circle.setAttribute('cy', shape.y.toString());
        circle.setAttribute('r', this.config.junctionRadius.toString());
        circle.setAttribute('fill', '#000000');
        return circle;
    }

    private createSlash(shape: Shape): SVGTextElement {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', shape.x.toString());
        text.setAttribute('y', shape.y.toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '32');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'black');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.textContent = '//';
        return text;
    }

    private addLabel(g: SVGGElement, shape: Shape, color: string): void {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', shape.x.toString());
        text.setAttribute('y', shape.y.toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', color);
        text.textContent = shape.age || '';
        g.appendChild(text);
    }

    /**
     * 一時的な点を描画（線描画時のガイド用）
     */
    public renderTempPoint(x: number, y: number): void {
        const temp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        temp.setAttribute('cx', x.toString());
        temp.setAttribute('cy', y.toString());
        temp.setAttribute('r', '5');
        temp.setAttribute('fill', '#10B981');
        temp.setAttribute('id', 'temp-point');
        this.canvas.appendChild(temp);
    }

    /**
     * キャンバスに要素を追加
     */
    public appendChild(element: SVGElement): void {
        this.canvas.appendChild(element);
    }
}
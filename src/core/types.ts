// ========================================
// 図形の種類
// ========================================
export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'junction' | 'slash' | 'star';
// ユーザーが配置できる接続点
export type PlaceableShapeType = Exclude<ShapeType, 'junction'>;
// 図形データ
export interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    age?: string;
}

// ========================================
// ラインのスタイル
// ========================================
export type LineStyle = 'normal' | 'double' | 'wave' | 'dotted' | 'arrow';
// 選べる色
export type LineColorName = 'black' | 'red' | 'blue' | 'green';
// 色の詳細
export const LINE_COLORS: Record<LineColorName, string> = {
    black: '#1F2937',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981'
} as const;
// ラインデータ（座標指定）
export interface Line {
    id: string;
    startId?: string;
    endId?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    style: LineStyle;
    color: string;
}

// ========================================
// モード選択
// ========================================
export type EditorMode = 'add' | 'line' | 'delete';
// ジェノグラムデータ全体
export interface GenogramData {
    shapes: Shape[];
    lines: Line[];
}

// ========================================
// エディタのイベント型
// ========================================
export interface GenogramEditorEvents {
    'change': CustomEvent<GenogramData>;
    'modeChange': CustomEvent<EditorMode>;
    'shapeAdd': CustomEvent<Shape>;
    'shapeDelete': CustomEvent<string>;
    'lineAdd': CustomEvent<Line>;
    'lineDelete': CustomEvent<string>;
}
// エディタの設定
export interface GenogramEditorOptions {
    gridSize?: number;           // グリッドサイズ（デフォルト: 30）
    enableAutoSave?: boolean;    // 自動保存の有効化
    autoSaveInterval?: number;   // 自動保存間隔（ミリ秒）
}

// ========================================
// レンダリングの設定
// ========================================
export interface RenderConfig {
    shapeSize: number;
    junctionRadius: number;
    lineWidth: number;
    gridColor: string;
    shapeColors: Record<Exclude<ShapeType, 'junction' | 'slash'>, string>;
}
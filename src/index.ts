// コアクラス
export { GenogramEditor } from './core/GenogramEditor';
export { GenogramRenderer } from './core/renderer';

// UIコンポーネント
export { GenogramEditorUI, type GenogramEditorUIOptions } from './ui/GenogramEditorUI';

// 型定義（すべてエクスポート）
export type {
    Shape,
    Line,
    ShapeType,
    PlaceableShapeType,
    LineStyle,
    LineColorName,
    EditorMode,
    GenogramData,
    GenogramEditorOptions,
    GenogramEditorEvents,
    RenderConfig
} from './core/types';

// 定数
export { LINE_COLORS } from './core/types';

// ストレージアダプター
export { LocalStorageAdapter } from './storage/LocalStorageAdapter';
export { StorageError } from './storage/StorageAdapter';
export type { StorageAdapter, GenogramMetadata } from './storage/StorageAdapter';

/**
 * パッケージバージョン
 */
export const VERSION = '1.0.0';

/**
 * デフォルトエクスポート: 簡易初期化関数
 * 
 * @example
 * ```typescript
 * import createGenogramEditor from 'genogram-editor';
 * 
 * const ui = createGenogramEditor({
 *   container: document.getElementById('app')!
 * });
 * ```
 */
import { GenogramEditorUI } from './ui/GenogramEditorUI';
import type { GenogramEditorUIOptions } from './ui/GenogramEditorUI';

export default function createGenogramEditor(options: GenogramEditorUIOptions): GenogramEditorUI {
    return new GenogramEditorUI(options);
}
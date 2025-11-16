import type { EditorMode, PlaceableShapeType, LineStyle, LineColorName } from '../core/types';
import { GenogramEditor } from '../core/GenogramEditor';

/**
 * UIコンポーネントの設定オプション
 */
export interface GenogramEditorUIOptions {
    container: HTMLElement;
    canvasWidth?: number;
    canvasHeight?: number;
    showExportButton?: boolean;
    onExport?: (json: string) => void;
    onClear?: () => void;
}

/**
 * ジェノグラムエディタのUIコンポーネント
 */
export class GenogramEditorUI {
    private editor: GenogramEditor;
    private container: HTMLElement;
    private canvas: SVGSVGElement;
    private options: Required<GenogramEditorUIOptions>;

    // UI要素への参照
    private elements: {
        shapeSelector: HTMLElement;
        lineSelector: HTMLElement;
        colorSelector: HTMLElement;
        ageInput: HTMLInputElement;
    } | null = null;

    constructor(options: GenogramEditorUIOptions) {
        this.options = {
            canvasWidth: 1200,
            canvasHeight: 900,
            showExportButton: true,
            onExport: (json) => {
                console.log(json);
                alert('コンソールを確認');
            },
            onClear: () => { },
            ...options
        };

        this.container = options.container;
        this.canvas = this.createCanvas();
        this.editor = new GenogramEditor(this.canvas);

        this.render();
        this.attachEventListeners();
        this.initializeDefaultState();
    }

    /**
     * SVGキャンバスを作成
     */
    private createCanvas(): SVGSVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'genogram-canvas');
        svg.setAttribute('width', this.options.canvasWidth.toString());
        svg.setAttribute('height', this.options.canvasHeight.toString());
        svg.style.border = '5px solid #000000';
        svg.style.background = 'white';
        return svg;
    }

    /**
     * UIをレンダリング
     */
    private render(): void {
        this.container.innerHTML = `
      <div class="genogram-container">
        <div class="genogram-sidebar">
          <h1>Genogram Editor</h1>
          
          <div class="genogram-modebar">
            <button id="mode-add" data-mode="add">配置モード</button>
            <button id="mode-line" data-mode="line">ラインモード</button>
            <button id="mode-delete" data-mode="delete">削除モード</button>
          </div>
          
          <div id="shape-selector" class="genogram-shape-selector">
            <strong>図形</strong>
            <hr>
            <div class="shape-buttons">
              <button data-shape="square">四角</button>
              <button data-shape="circle">円</button>
              <button data-shape="triangle">三角</button>
              <button data-shape="diamond">ひし形</button>
              <button data-shape="star">星形</button>
              <button data-shape="slash">二重斜線</button>
            </div>
            <hr>
            <div>
              <label for="age-input">入力 :</label>
              <input type="text" id="age-input">
            </div>
          </div>
          
          <div id="line-selector" class="genogram-line-selector">
            <strong>ライン</strong>
            <hr>
            <div class="line-buttons">
              <button data-line="normal">─ 直線</button>
              <button data-line="double">═ 二重線</button>
              <button data-line="wave">～ 波線</button>
              <button data-line="dotted">--- 点線</button>
              <button data-line="arrow">➡ 矢印</button>
            </div>
          </div>

          <div id="color-selector" class="genogram-color-selector">
            <strong>線の色</strong>
            <div class="color-buttons">
              <button data-color="black">黒</button>
              <button data-color="red">赤</button>
              <button data-color="blue">青</button>
              <button data-color="green">緑</button>
            </div>
          </div>

          <hr>
          
          <div class="genogram-export-selector">
            ${this.options.showExportButton ? '<button id="export">エクスポート</button>' : ''}
            <button id="clear">すべてクリア</button>
          </div>
        </div>

        <div id="canvas-wrapper"></div>
      </div>
    `;

        // キャンバスを配置
        const wrapper = this.container.querySelector('#canvas-wrapper');
        if (wrapper) {
            wrapper.appendChild(this.canvas);
        }

        // UI要素への参照を保存
        this.elements = {
            shapeSelector: this.container.querySelector('#shape-selector')!,
            lineSelector: this.container.querySelector('#line-selector')!,
            colorSelector: this.container.querySelector('#color-selector')!,
            ageInput: this.container.querySelector('#age-input')!
        };
    }

    /**
     * イベントリスナーを設定
     */
    private attachEventListeners(): void {
        // モード切替
        this.container.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = (e.target as HTMLElement).dataset.mode as EditorMode;
                this.handleModeChange(mode);
                this.setActiveButton('.genogram-modebar button', e.target as HTMLElement);
            });
        });

        // 図形選択
        this.container.querySelectorAll('[data-shape]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = (e.target as HTMLElement).dataset.shape as PlaceableShapeType;
                this.editor.setSelectedShapeType(shape);
                this.setActiveButton('.shape-buttons button', e.target as HTMLElement);
            });
        });

        // ライン選択
        this.container.querySelectorAll('[data-line]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const line = (e.target as HTMLElement).dataset.line as LineStyle;
                this.editor.setLineStyle(line);
                this.setActiveButton('.line-buttons button', e.target as HTMLElement);
            });
        });

        // 色選択
        this.container.querySelectorAll('[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = (e.target as HTMLElement).dataset.color as LineColorName;
                this.editor.setLineColor(color);
                this.setActiveButton('.color-buttons button', e.target as HTMLElement);
            });
        });

        // 入力
        this.elements?.ageInput.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            this.editor.setAge(input.value);
        });

        // エクスポート
        if (this.options.showExportButton) {
            this.container.querySelector('#export')?.addEventListener('click', () => {
                const json = this.editor.exportJSON();
                this.options.onExport(json);
            });
        }

        // クリア
        this.container.querySelector('#clear')?.addEventListener('click', () => {
            if (confirm('すべてクリアしますか？')) {
                this.editor.clear();
                this.options.onClear();
            }
        });
    }

    /**
     * モード変更時の処理
     */
    private handleModeChange(mode: EditorMode): void {
        this.editor.setMode(mode);

        if (!this.elements) return;

        // 表示/非表示の切り替え
        this.elements.shapeSelector.style.display = mode === 'add' ? 'block' : 'none';
        this.elements.lineSelector.style.display = mode === 'line' ? 'block' : 'none';
        this.elements.colorSelector.style.display = mode === 'line' ? 'block' : 'none';
    }

    /**
     * アクティブボタンの設定
     */
    private setActiveButton(selector: string, activeBtn: HTMLElement): void {
        this.container.querySelectorAll(selector).forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    /**
     * 初期状態を設定
     */
    private initializeDefaultState(): void {
        if (!this.elements) return;

        // 初期表示設定
        this.elements.shapeSelector.style.display = 'block';
        this.elements.lineSelector.style.display = 'none';
        this.elements.colorSelector.style.display = 'none';

        // デフォルトのアクティブボタン
        this.container.querySelector('[data-mode="add"]')?.classList.add('active');
        this.container.querySelector('[data-shape="square"]')?.classList.add('active');
        this.container.querySelector('[data-line="normal"]')?.classList.add('active');
        this.container.querySelector('[data-color="black"]')?.classList.add('active');
    }

    /**
     * エディタインスタンスを取得
     */
    public getEditor(): GenogramEditor {
        return this.editor;
    }

    /**
     * クリーンアップ
     */
    public destroy(): void {
        this.editor.destroy();
        this.container.innerHTML = '';
    }
}
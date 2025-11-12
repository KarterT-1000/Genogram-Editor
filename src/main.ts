import './style.css'
import { GenogramEditor } from './GenogramEditor'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="container">
  <div class="sidebar">
    <h1>Genogram Editor</h1>
    
    <div class="modebar">
      <button id="mode-add">配置モード</button>
      <button id="mode-line">ラインモード</button>
      <button id="mode-delete">削除モード</button>
    </div>
    
    <div id="shape-selector">
      <strong>図形</strong>
      <hr>
      <div class="shape-selector">
        <button id="shape-square">四角</button>
        <button id="shape-circle">円</button>
        <button id="shape-triangle">三角</button>
        <button id="shape-diamond">ひし形</button>
        <button id="shape-slash">二重斜線</button>
      </div>
      <hr>
      <div>
        <label for="age-input">年齢入力</label>
        <input type="text" id="age-input" style="width: 60px;">
      </div>
    </div>
    
    <div id="line-selector">
      <strong>ライン</strong>
      <hr>
      <div class="line-selector">
        <button id="line-normal">─ 直線</button>
        <button id="line-double">═ 二重線</button>
        <button id="line-wave">～ 波線</button>
      </div>
    </div>

    <div id="color-selector">
      <strong>線の色</strong>
      <div class="color-selector">
        <button id="line-color-black">黒</button>
        <button id="line-color-red">赤</button>
        <button id="line-color-blue">青</button>
        <button id="line-color-green">緑</button>
      </div>
    </div>

    <hr>
    
    <div class="export-selector">
      <button id="export">エクスポート</button>
      <button id="clear">すべてクリア</button>
    </div>

  </div>

  <div>
   <svg id="genogram-canvas" width="1200" height="900" style="border: 5px solid #000000ff; background: white;"></svg>
  </div>
</div>
`

const editor = new GenogramEditor('genogram-canvas')

const shapeSelector = document.getElementById('shape-selector')!
const lineSelector = document.getElementById('line-selector')!
const colorSelector = document.getElementById("color-selector")!

//これが初期状態の表示したいもの'block'表示,'none'非表示
shapeSelector.style.display = 'block'
lineSelector.style.display = 'none'
colorSelector.style.display = 'none'
document.getElementById('mode-add')?.classList.add('active')
document.getElementById('shape-square')?.classList.add('active')
document.getElementById('line-normal')?.classList.add('active')
document.getElementById('line-color-black')?.classList.add('active')

//--------------------
// モード切替した時の表示と非表示
//--------------------
document.getElementById('mode-add')?.addEventListener('click', (e) => {
  editor.setMode('add')
  shapeSelector.style.display = 'block'
  lineSelector.style.display = 'none'
  colorSelector.style.display = 'none'
  // モードボタンのactive切り替え
  document.querySelectorAll('.modebar button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('mode-line')?.addEventListener('click', (e) => {
  editor.setMode('line')
  shapeSelector.style.display = 'none'
  lineSelector.style.display = 'block'
  colorSelector.style.display = 'block'
  // モードボタンのactive切り替え
  document.querySelectorAll('.modebar button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('mode-delete')?.addEventListener('click', (e) => {
  editor.setMode('delete')
  shapeSelector.style.display = 'none'
  lineSelector.style.display = 'none'
  colorSelector.style.display = 'none'
  // モードボタンのactive切り替え
  document.querySelectorAll('.modebar button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

//--------------------
// 線の色選択
//--------------------
document.getElementById('line-color-black')?.addEventListener('click', (e) => {
  editor.setLineColor('black')
  document.querySelectorAll('.color-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('line-color-red')?.addEventListener('click', (e) => {
  editor.setLineColor('red')
  document.querySelectorAll('.color-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('line-color-blue')?.addEventListener('click', (e) => {
  editor.setLineColor('blue')
  document.querySelectorAll('.color-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('line-color-green')?.addEventListener('click', (e) => {
  editor.setLineColor('lightgreen')
  document.querySelectorAll('.color-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

// --------------------
// 図形選択
//--------------------
document.getElementById('shape-square')?.addEventListener('click', (e) => {
  editor.setSelectedShapeType('square')
  document.querySelectorAll('.shape-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('shape-circle')?.addEventListener('click', (e) => {
  editor.setSelectedShapeType('circle')
  document.querySelectorAll('.shape-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('shape-triangle')?.addEventListener('click', (e) => {
  editor.setSelectedShapeType('triangle')
  document.querySelectorAll('.shape-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('shape-diamond')?.addEventListener('click', (e) => {
  editor.setSelectedShapeType('diamond')
  document.querySelectorAll('.shape-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})
document.getElementById('shape-slash')?.addEventListener('click', (e) => {
  editor.setSelectedShapeType('slash')
  document.querySelectorAll('.shape-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

//--------------------
// 年齢入力
//--------------------
document.getElementById('age-input')?.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  editor.setAge(input.value);
});

//--------------------
// 線の種類選択
//--------------------
document.getElementById('line-normal')?.addEventListener('click', (e) => {
  editor.setLineStyle('normal')
  document.querySelectorAll('.line-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('line-double')?.addEventListener('click', (e) => {
  editor.setLineStyle('double')
  document.querySelectorAll('.line-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

document.getElementById('line-wave')?.addEventListener('click', (e) => {
  editor.setLineStyle('wave')
  document.querySelectorAll('.line-selector button').forEach(btn => btn.classList.remove('active'))
    ; (e.target as HTMLElement).classList.add('active')
})

//--------------------
// その他
//--------------------
document.getElementById('export')?.addEventListener('click', () => {
  console.log(editor.exportJSON())
  alert('コンソールを確認')
})

document.getElementById('clear')?.addEventListener('click', () => {
  editor.clear()
})
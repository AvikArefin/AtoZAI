// Linear regression data explainer: the true line y = 1 + 2x → 100 inputs drawn from N(0, 1) land on it →
// 0.1·ε noise nudges each point off the line, giving the page's scatter plot.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/linear-regression-data/), export the JSON to src/scenes/linear-regression-data.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./linear-regression-data.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once linear-regression-data.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    lineDraw: [[1.2, 0, 'ease'], [4, 1]],
    formula: [[3.5, 0], [4.5, 1]],
    lineLabel: [[4.5, 0], [5.5, 1]],
    xIn: [[9.5, 0], [11, 1]],
    rise: [[11.5, 0, 'ease'], [14.5, 1]],
    noiseEq: [[18.8, 0], [19.8, 1]],
    zoom: [[19, 0], [20, 1]], // the magnified noise strip fades in, then grows with `noise`
    noise: [[20, 0, 'ease'], [22.5, 1]],
    lineDim: [[24.5, 0], [26, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
// Exact data from the page's code (doc/machine-learning/linear-regression.md, "Generating the data"):
// np.random.seed(13); x = np.random.randn(100, 1); noise = 0.1 * np.random.randn(100, 1). Rounded to 3 decimals.
const TRUE_B = 1, TRUE_W = 2
const XS = [
  -0.712, 0.754, -0.045, 0.452, 1.345, 0.532, 1.350, 0.861, 1.479, -1.045, -0.789, -1.262, 0.563, -0.243, 0.914, 0.317,
  0.127, 2.150, 0.606, -0.027, -0.984, 1.191, 0.953, -1.087, -0.145, 0.238, -1.639, -0.278, 1.399, -1.615, 0.491, 1.893,
  -0.621, -0.454, 0.217, 0.514, 0.397, -1.513, -0.764, 0.101, -0.317, 1.138, -0.322, -0.370, 1.850, -0.082, -0.980, -0.002,
  -0.232, 0.711, 0.453, -0.333, -0.384, -0.530, 1.350, 2.015, -0.058, 0.565, 0.360, -0.512, -0.523, -0.481, -1.924, -0.757,
  0.453, 0.922, -0.207, -0.376, 0.640, 2.054, -0.928, -0.775, -0.437, 0.548, -0.854, 0.466, -0.721, 0.562, -0.315, -0.430,
  0.815, -1.185, -0.769, 0.729, 0.766, 0.208, -2.187, 0.722, 0.349, -0.339, -1.945, 0.831, 1.749, 0.501, 1.330, -0.658,
  0.185, -0.651, -1.121, -0.347,
]
const NOISE = [
  -0.091, -0.075, -0.077, -0.041, -0.029, 0.013, -0.125, 0.032, -0.182, 0.006, 0.008, -0.232, -0.034, 0.109, 0.045, -0.049,
  -0.055, 0.029, 0.015, 0.082, 0.014, 0.091, 0.040, -0.076, -0.102, -0.053, 0.041, -0.087, 0.089, -0.154, -0.026, -0.093,
  0.031, 0.014, -0.015, -0.124, -0.088, -0.066, 0.099, -0.064, 0.050, 0.092, -0.084, -0.052, -0.221, -0.040, 0.071, -0.095,
  0.035, 0.079, 0.036, -0.044, 0.023, -0.068, -0.042, 0.239, -0.051, -0.069, 0.015, 0.028, 0.075, -0.076, -0.105, -0.098,
  0.075, 0.108, -0.076, -0.051, -0.003, -0.096, -0.050, 0.094, -0.122, 0.037, 0.118, -0.108, 0.109, 0.000, -0.054, 0.087,
  0.007, -0.024, -0.058, -0.084, -0.055, -0.024, 0.076, -0.025, 0.029, -0.039, 0.048, -0.007, 0.127, 0.026, -0.166, -0.012,
  -0.044, 0.096, 0.002, 0.086,
]
const line = (x: number) => TRUE_B + TRUE_W * x
// Axis ranges of the original matplotlib figure (data extent + matplotlib's default 5% margins).
const X_MIN = -2.404, X_MAX = 2.367, Y_MIN = -3.729, Y_MAX = 5.761
const X_TICKS = [-2, -1, 0, 1, 2], Y_TICKS = [-2, 0, 2, 4]
// The true line, clipped to the plot box.
const LINE_X0 = Math.max(X_MIN, (Y_MIN - TRUE_B) / TRUE_W), LINE_X1 = Math.min(X_MAX, (Y_MAX - TRUE_B) / TRUE_W)
// The zoom strip plots the noise itself, y − (1 + 2x), magnified: ±ZOOM_RANGE fills its height.
const ZOOM_RANGE = 0.3, ZOOM_TICKS = [-0.2, 0.2]
const num = (v: number) => (v < 0 ? `−${-v}` : `${v}`) // Unicode minus for tick labels

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['The true model', 'y = b + w·x  ·  b = 1, w = 2', 'Pick the answer first: a line with bias 1 and weight 2, which training must later recover.'],
  ['100 random inputs', 'x = np.random.randn(100, 1)  ·  seed 13', 'Each x comes from N(0, 1), so most land near 0; on the true model, y = 1 + 2x exactly.'],
  ['Add the noise', 'noise = 0.1 · np.random.randn(100, 1)', 'A small Gaussian nudge moves each point off the line: the scatter plot that training fits.'],
]

export default function mount(host: HTMLElement, { autoplay }: SceneOptions) {
  // ---------- 6. SVG stage (1280×720 coordinate space, always) ----------
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 1280 720')
  host.appendChild(svg)
  const el = (tag: string, attrs: Record<string, string | number> = {}, parent: Element = svg) => {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, String(attrs[k]))
    parent.appendChild(e)
    return e
  }
  const set = (e: Element, attrs: Record<string, string | number>) => { for (const k in attrs) e.setAttribute(k, String(attrs[k])) }

  // ---------- 7. Theatre objects: everything a human may want to tweak ----------
  const project = getProject('AtoZAI · Linear Regression Data', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const offset = (dx: number, dy: number) => ({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(220, 170), width: t.number(860, { range: [300, 1100] }), height: t.number(420, { range: [150, 470] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    formula: t.compound(offset(32, 44)), // from the plot's top-left corner
    lineLabel: t.compound({ ...offset(-14, -10), atX: t.number(1, { range: [-2, 2] }) }), // from the line at x = atX
    zoom: t.compound({ ...pos(690, 440), width: t.number(370, { range: [150, 800] }), height: t.number(110, { range: [40, 300] }) }),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: the noise
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: the true model
    point: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 1 }), // the data points
    pointRadius: t.number(4.5, { range: [1, 14] }),
    lineWidth: t.number(2.5, { range: [1, 6] }),
    residWidth: t.number(1.5, { range: [0.5, 5] }),
    zoomRadius: t.number(2.5, { range: [0.5, 8] }),
    lineDimTo: t.number(0.3, { range: [0, 1] }), // line opacity once the scatter stands on its own
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), lineDraw: progress(), formula: progress(), lineLabel: progress(),
    xIn: progress(), rise: progress(), noiseEq: progress(), zoom: progress(), noise: progress(), lineDim: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const MATH = { 'font-family': 'JetBrains Mono Variable, monospace' }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const gPlot = el('g')
  const gAxes = el('g', {}, gPlot)
  const gridX = X_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const gridY = Y_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const axX = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes), axY = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)
  const tickX = X_TICKS.map(v => { const e = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gAxes); e.textContent = num(v); return e })
  const tickY = Y_TICKS.map(v => { const e = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes); e.textContent = num(v); return e })
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'x'; labY.textContent = 'y'
  const rug = XS.map(() => el('line', {}, gPlot))
  const trueLine = el('line', { 'stroke-linecap': 'round' }, gPlot)
  const dots = XS.map(() => el('circle', {}, gPlot))
  const lineText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gPlot)
  lineText.textContent = 'TRUE MODEL'
  // zoom strip: the same 100 points with the line taken out and the noise magnified
  const gZoom = el('g', {}, gPlot)
  const zoomBg = el('rect', { fill: '#0d0d0d', stroke: '#3a3a37', 'stroke-width': 1 }, gZoom)
  const zoomGrid = ZOOM_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gZoom))
  const zoomTick = ZOOM_TICKS.map(v => { const e = el('text', { ...LABEL, 'font-size': 11, 'text-anchor': 'end' }, gZoom); e.textContent = v > 0 ? `+${v}` : num(v); return e })
  const zoomZero = el('line', {}, gZoom)
  const resid = XS.map(() => el('line', {}, gZoom))
  const zoomDots = XS.map(() => el('circle', {}, gZoom))
  const zoomText = el('text', { ...LABEL, 'font-size': 13 }, gZoom)
  zoomText.textContent = 'ZOOM · NOISE = y − (1 + 2x)'
  const fModel = el('text', { ...MATH, fill: '#ededea', 'font-size': 22 }, gPlot)
  const fNoisy = el('text', { ...MATH, fill: '#ededea', 'font-size': 22 }, gPlot)
  const fX = el('text', { ...MATH, fill: '#8d8c86', 'font-size': 17 }, gPlot)
  const fEps = el('text', { ...MATH, fill: '#8d8c86', 'font-size': 17 }, gPlot)
  fModel.textContent = 'y = 1 + 2x'
  fNoisy.textContent = 'y = 1 + 2x + 0.1·ε'
  fX.textContent = 'x ~ N(0, 1)'
  fEps.textContent = 'ε ~ N(0, 1)'

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot
    const X = (v: number) => px + ((v - X_MIN) / (X_MAX - X_MIN)) * w
    const Y = (v: number) => py + h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * h

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // axes, ticks and faint gridlines (same ranges and ticks as the original figure)
    set(gAxes, { opacity: T.axesIn })
    set(axX, { x1: px, y1: py + h, x2: px + w, y2: py + h })
    set(axY, { x1: px, y1: py + h, x2: px, y2: py })
    X_TICKS.forEach((v, i) => {
      set(gridX[i], { x1: X(v), y1: py, x2: X(v), y2: py + h })
      set(tickX[i], { x: X(v), y: py + h + 22 })
    })
    Y_TICKS.forEach((v, i) => {
      set(gridY[i], { x1: px, y1: Y(v), x2: px + w, y2: Y(v) })
      set(tickY[i], { x: px - 10, y: Y(v) + 4 })
    })
    set(labX, { x: px + w / 2, y: py + h + 44 })
    set(labY, { x: px - 44, y: py + h / 2 + 4 })

    // slide 1: the true line draws in, with its equation
    const lx1 = lerp(LINE_X0, LINE_X1, T.lineDraw)
    set(trueLine, {
      x1: X(LINE_X0), y1: Y(line(LINE_X0)), x2: X(lx1), y2: Y(line(lx1)),
      stroke: rgba(S.after), 'stroke-width': S.lineWidth,
      opacity: (T.lineDraw > 0 ? 1 : 0) * lerp(1, S.lineDimTo, T.lineDim),
    })
    const ax = L.lineLabel.atX
    set(lineText, { x: X(ax) + L.lineLabel.dx, y: Y(line(ax)) + L.lineLabel.dy, fill: rgba(S.after), opacity: T.lineLabel * (1 - T.lineDim) })
    const fx = px + L.formula.dx, fy = py + L.formula.dy
    set(fModel, { x: fx, y: fy, opacity: T.formula * (1 - T.noiseEq) })
    set(fNoisy, { x: fx, y: fy, opacity: T.noiseEq })
    set(fX, { x: fx, y: fy + 32, opacity: T.xIn })
    set(fEps, { x: fx, y: fy + 58, opacity: T.noiseEq })

    // slide 2: x values appear as a rug on the x axis, then rise onto the line (y = 1 + 2x exactly)
    // slide 3: each point moves by its own noise (the zoom strip shows how far)
    const floor = py + h - 6
    XS.forEach((x, i) => {
      const yNow = Y(line(x) + NOISE[i] * T.noise)
      set(rug[i], { x1: X(x), y1: py + h, x2: X(x), y2: py + h - 12, stroke: '#8d8c86', 'stroke-width': 1.5, opacity: 0.6 * T.xIn })
      set(dots[i], { cx: X(x), cy: lerp(floor, yNow, T.rise), r: S.pointRadius * T.xIn, fill: rgba(S.point) })
    })
    // the zoom strip: x as in the main plot (squeezed), y = the noise only, magnified; orange sticks = the nudge
    const Z = L.zoom, zMid = Z.y + Z.height / 2
    const ZX = (v: number) => Z.x + ((v - X_MIN) / (X_MAX - X_MIN)) * Z.width
    const ZY = (v: number) => zMid - (v / ZOOM_RANGE) * (Z.height / 2)
    set(gZoom, { opacity: T.zoom })
    set(zoomBg, { x: Z.x, y: Z.y, width: Z.width, height: Z.height })
    ZOOM_TICKS.forEach((v, i) => {
      set(zoomGrid[i], { x1: Z.x, y1: ZY(v), x2: Z.x + Z.width, y2: ZY(v) })
      set(zoomTick[i], { x: Z.x - 6, y: ZY(v) + 4 })
    })
    set(zoomZero, { x1: Z.x, y1: zMid, x2: Z.x + Z.width, y2: zMid, stroke: rgba(S.after), 'stroke-width': 1.5 })
    XS.forEach((x, i) => {
      const zy = ZY(NOISE[i] * T.noise)
      set(resid[i], { x1: ZX(x), y1: zMid, x2: ZX(x), y2: zy, stroke: rgba(S.before), 'stroke-width': S.residWidth })
      set(zoomDots[i], { cx: ZX(x), cy: zy, r: S.zoomRadius, fill: rgba(S.point) })
    })
    set(zoomText, { x: Z.x, y: Z.y - 10 })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Generating regression data'
  const time = document.createElement('span')
  time.className = 'scene-time'
  const restartBtn = document.createElement('button'), playBtn = document.createElement('button')
  restartBtn.className = 'key'; restartBtn.type = 'button'; restartBtn.textContent = '↺ Restart'
  playBtn.className = 'key key--signal'; playBtn.type = 'button'; playBtn.textContent = '▶ Play'
  bar.append(name, time, restartBtn, playBtn)
  host.appendChild(bar)
  const tick = () => { time.textContent = `${sheet.sequence.position.toFixed(1).padStart(4, '0')}s` }
  const end = () => val(sheet.sequence.pointer.length)

  let playing = false
  const play = async () => {
    if (sheet.sequence.position >= end() - 0.01) sheet.sequence.position = 0
    playing = true; playBtn.textContent = '❚❚ Pause'; playBtn.setAttribute('aria-pressed', 'true')
    await sheet.sequence.play()
    playing = false; playBtn.textContent = '▶ Play'; playBtn.setAttribute('aria-pressed', 'false')
  }
  playBtn.onclick = () => (playing ? sheet.sequence.pause() : play())
  restartBtn.onclick = () => { sheet.sequence.position = 0; play() }

  for (const o of [layout, style, timeline]) o.onValuesChange(render)
  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) sheet.sequence.pause() }).observe(host)
  const loop = () => { if (visible) { render(); tick() } requestAnimationFrame(loop) }
  project.ready.then(() => {
    render(); loop()
    if (!autoplay) return // edit page: Studio owns the playhead
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play()
    else sheet.sequence.position = end() // reduced motion: show the final frame
  })
  return project
}

// Stride-instability explainer: a learning-rate sweep exposes the stride-1×1 bug → at lr 0.001 both models train
// → at lr 0.1 the 1×1 model's loss blows up. All curves and points are traced from the original figure.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/stride-instability/), export the JSON to src/scenes/stride-instability.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./stride-instability.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 29 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once stride-instability.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [10, 1, 'hold'], [19.5, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [10, 0], [10.8, 1, 'hold'], [19.5, 0], [20.3, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    sweepDraw: [[1.2, 0], [5.5, 1]], // both sweep curves draw left → right
    crosses: [[6, 0], [7, 1]], // unstable 1×1 trials turn into ×
    best: [[7.6, 0], [8.6, 1]], // ★ best learning rate of each model
    shrink: [[10, 0, 'ease'], [11.6, 1]], // sweep moves into the small panel on the left
    marker: [[11.6, 0], [12.4, 1]], // which learning rate the loss panel shows
    slowIn: [[11.2, 0], [12.2, 1], [19.5, 1], [20.3, 0]],
    slowDraw: [[12.4, 0], [17.4, 1]],
    pick: [[19.5, 0, 'ease'], [21, 1]], // marker slides from lr 0.001 to lr 0.1
    fastIn: [[20.3, 0], [21.1, 1]],
    fastDraw: [[21.2, 0], [26.2, 1]],
    spike: [[22.4, 0], [23.2, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
type Pt = [x: number, y: number]
// Traced from google-research/tuning_playbook assets/stride_instability.png (CC BY 4.0).
// Accuracy ≈ ±1 px of the 894×568 original: ±0.002 test error, ±1.5% loss (lr 0.001), ±3% loss (lr 0.1).
// Top panel: test error rate vs base learning rate. The sweep sits on a 10^(−3 + k/3) grid, 0.001 … 1.
const LRS = Array.from({ length: 10 }, (_, k) => 10 ** (-3 + k / 3))
const STD_ERR = [0.206, 0.139, 0.104, 0.0809, 0.059, 0.0496, 0.0419, 0.0372, 0.0388, 0.0392] // standard WideResNet
const S11_ERR = [0.157, 0.12, 0.0936, 0.0726, 0.0785, 0.116, 0.187, 0.138, 0.0867] // stride 1×1; its lr-1 trial is off the chart
const S11_EXIT: Pt = [0.567, 0.3] // where the 1×1 line leaves the top of the axis, heading for that off-chart trial
const UNSTABLE = [4, 5, 6, 7, 8] // 1×1 trials marked "significant training instability"
const STD_BEST = 7, S11_BEST = 3 // ★ best learning rate: 0.215 (standard) and 0.01 (1×1)
const sweepStd: Pt[] = LRS.map((lr, k): Pt => [lr, STD_ERR[k]])
const sweepS11: Pt[] = [...S11_ERR.map((e, k): Pt => [LRS[k], e]), S11_EXIT]
// Bottom panels: train loss vs global step (both axes log), as [step, loss]. Steps to 3 significant figures.
const SLOW_STD: Pt[] = [ // lr 0.001, standard
  [1, 2.8], [2, 2.75], [2.7, 2.74], [4.23, 2.75], [5, 2.74], [6, 2.74], [7, 2.72], [8.22, 2.73],
  [8.9, 2.71], [9.9, 2.71], [11, 2.67], [12.9, 2.68], [15.1, 2.63], [16.8, 2.65], [18.7, 2.61], [24.4, 2.56],
  [29.4, 2.58], [32.7, 2.56], [38.3, 2.56], [40.4, 2.54], [47.3, 2.54], [54.1, 2.49], [60.1, 2.54], [72.4, 2.47],
  [84.9, 2.5], [94.4, 2.5], [120, 2.46], [140, 2.41], [156, 2.41], [174, 2.37], [204, 2.39], [226, 2.36],
  [252, 2.39], [303, 2.3], [346, 2.3], [395, 2.29], [451, 2.24], [489, 2.26], [604, 2.19], [655, 2.19],
  [709, 2.2], [809, 2.15], [900, 2.14], [1030, 2.13], [1170, 2.08], [1270, 2.07], [1410, 2.02], [1530, 2.04],
  [1660, 2.02], [1840, 1.98], [2050, 1.99], [2280, 1.93], [2530, 1.95], [2740, 1.93], [2970, 1.88], [3050, 1.87],
  [3300, 1.88], [3670, 1.83], [4080, 1.83], [4420, 1.82], [4920, 1.78], [5180, 1.79], [5760, 1.78], [6410, 1.74],
  [7130, 1.73], [7720, 1.69], [7920, 1.69], [9290, 1.71], [10300, 1.67], [11200, 1.66], [14600, 1.65],
]
const SLOW_S11: Pt[] = [ // lr 0.001, stride 1×1
  [1, 2.78], [2, 2.69], [3.08, 2.68], [4, 2.72], [6, 2.63], [7, 2.67], [8.9, 2.57], [9.9, 2.6],
  [11, 2.55], [13.6, 2.56], [14.3, 2.55], [15.1, 2.49], [17.3, 2.52], [18.7, 2.52], [20.8, 2.48], [23, 2.49],
  [24.9, 2.33], [25.2, 2.35], [25.9, 2.34], [27.3, 2.39], [28.6, 2.39], [30.2, 2.37], [33.5, 2.41], [36.3, 2.46],
  [37.3, 2.47], [39.3, 2.46], [41.2, 2.45], [41.7, 2.41], [42.3, 2.43], [44, 2.34], [44.6, 2.35], [45.2, 2.33],
  [48.6, 2.36], [54.1, 2.31], [60.1, 2.34], [70.5, 2.27], [71.9, 2.27], [72.9, 2.29], [73.8, 2.28], [76.8, 2.35],
  [77.9, 2.34], [80.5, 2.37], [94.4, 2.34], [98.9, 2.31], [100, 2.28], [102, 2.29], [103, 2.25], [104, 2.26],
  [106, 2.24], [117, 2.21], [140, 2.3], [144, 2.29], [155, 2.26], [161, 2.22], [174, 2.19], [198, 2.24],
  [209, 2.25], [231, 2.19], [247, 2.13], [257, 2.13], [267, 2.17], [280, 2.18], [303, 2.16], [337, 2.15],
  [385, 2.11], [406, 2.1], [451, 2.11], [544, 2.04], [589, 2.05], [709, 2.04], [853, 2.01], [1030, 1.96],
  [1120, 1.91], [1170, 1.9], [1270, 1.91], [1340, 1.91], [1700, 1.83], [1840, 1.83], [2050, 1.85], [2740, 1.76],
  [3300, 1.75], [3980, 1.69], [4420, 1.69], [4790, 1.67], [5320, 1.67], [5800, 1.61], [6580, 1.63], [8580, 1.57],
  [10300, 1.57], [12400, 1.54], [13800, 1.55], [14600, 1.54],
]
const FAST_STD: Pt[] = [ // lr 0.1, standard
  [1, 2.76], [4, 2.62], [4.72, 2.5], [6.32, 2.48], [6.85, 2.42], [8, 2.56], [9.93, 2.48], [12, 2.55],
  [15.2, 2.49], [18.3, 2.25], [19.3, 2.25], [20.9, 2.43], [23.2, 2.33], [26.5, 2.36], [30.2, 2.11], [33.6, 2.36],
  [37.4, 2.19], [48.7, 2.16], [52.8, 2.08], [60.3, 2.16], [67, 2.12], [72.6, 2.02], [80.7, 2.13], [97.1, 1.93],
  [105, 2.03], [114, 1.97], [152, 1.93], [174, 2.02], [210, 1.83], [329, 1.76], [366, 1.8], [386, 1.78],
  [452, 1.52], [656, 1.56], [710, 1.62], [811, 1.53], [951, 1.56], [1030, 1.45], [1180, 1.44], [1800, 1.3],
  [2110, 1.3], [2410, 1.24], [2750, 1.23], [3220, 1.15], [4090, 1.14], [5330, 1.03], [6950, 1], [10600, 0.862],
  [14600, 0.829],
]
const FAST_S11: Pt[] = [ // lr 0.1, stride 1×1: the spike
  [1, 2.8], [2, 37.2], [3.09, 68.4], [4, 78], [4.85, 77.8], [6, 66], [8, 40.2], [9, 18.5],
  [9.73, 15], [11, 12.9], [11.3, 11.9], [13.7, 4.34], [13.9, 4.46], [14.4, 4.08], [15.2, 4.11],
  [18.8, 5.93], [19.3, 5.93], [20.9, 5.2], [23.2, 5.19], [25.1, 5.01], [48.7, 5.4], [76.5, 5.41], [386, 5.26],
  [833, 5], [1700, 4.39], [3050, 3.76], [4670, 3.22], [11200, 2.08], [14600, 1.97],
]
const LAST_STEP = 14600

// Axes keep the original ranges, ticks and log scales.
type Axis = { min: number; max: number; log: boolean; ticks: [value: number, label: string][] }
const SWEEP_X: Axis = { min: 10 ** -3.15, max: 10 ** 0.15, log: true, ticks: [[1e-3, '10⁻³'], [1e-2, '10⁻²'], [0.1, '10⁻¹'], [1, '10⁰']] }
const SWEEP_Y: Axis = { min: 0, max: 0.3, log: false, ticks: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((v): [number, string] => [v, v.toFixed(2)]) }
const STEP_X: Axis = { min: 0.619, max: 23500, log: true, ticks: [[1, '10⁰'], [10, '10¹'], [100, '10²'], [1000, '10³'], [10000, '10⁴']] }
const SLOW_Y: Axis = { min: 1.494, max: 2.881, log: true, ticks: [1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8].map((v): [number, string] => [v, v.toFixed(1)]) }
const FAST_Y: Axis = { min: 0.657, max: 99.6, log: true, ticks: [[1, '10⁰'], [10, '10¹']] }
/** 0..1 position of `v` along an axis. */
const unit = (a: Axis, v: number) => (a.log ? Math.log(v / a.min) / Math.log(a.max / a.min) : (v - a.min) / (a.max - a.min))

/** SVG path of a polyline drawn up to screen x = `endX`, ending part-way along a segment so drawing is continuous. */
const path = (pts: Pt[], X: (v: number) => number, Y: (v: number) => number, endX: number) => {
  const q = pts.map(([a, b]): Pt => [X(a), Y(b)])
  let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`
  for (let i = 1; i < q.length; i++) {
    const [x0, y0] = q[i - 1], [x1, y1] = q[i]
    if (x1 <= endX) { d += `L${x1.toFixed(1)} ${y1.toFixed(1)}`; continue }
    if (endX > x0) d += `L${endX.toFixed(1)} ${lerp(y0, y1, (endX - x0) / (x1 - x0)).toFixed(1)}`
    break
  }
  return d
}
/** Five-pointed star centred on (x, y) with outer radius r. */
const star = (x: number, y: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r * 0.45 : r
    return `${i ? 'L' : 'M'}${(x + k * Math.cos(a)).toFixed(1)} ${(y + k * Math.sin(a)).toFixed(1)}`
  }).join('') + 'Z'
const cross = (x: number, y: number, s: number) => `M${x - s} ${y - s}L${x + s} ${y + s}M${x - s} ${y + s}L${x + s} ${y - s}`

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['The stride bug in a learning-rate sweep', 'WideResNet · CIFAR-10 · momentum · one block 2×2 → 1×1', 'Above 10⁻² the stride-1×1 model trains unstably (×); its best error is 7.3% vs 3.7%.'],
  ['Learning rate 0.001: both train', 'small learning rates are stable, but slow', 'Both losses fall smoothly, but slowly: after ~15k steps both are still above 1.5.'],
  ['Learning rate 0.1: the 1×1 model blows up', 'instability hurts performance at high learning rates', 'Its loss jumps from 2.8 to ~78 by step 4 and stays above the standard run to the end.'],
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
  const project = getProject('AtoZAI · Stride Instability', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const box = (x: number, y: number, w: number, h: number) =>
    ({ ...pos(x, y), w: t.number(w, { range: [150, 1100] }), h: t.number(h, { range: [120, 480] }) })
  const layout = sheet.object('Layout', {
    sweep: t.compound(box(170, 165, 960, 395)), // slide 1: the learning-rate sweep, full size
    sweepMini: t.compound(box(120, 205, 340, 245)), // slides 2–3: the same sweep, small, on the left
    loss: t.compound(box(600, 185, 590, 370)), // slides 2–3: train loss vs step
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    key: t.compound(pos(200, 194)),
    sweepStdLabel: t.compound(pos(1100, 536)),
    sweepS11Label: t.compound(pos(795, 292)),
    slowStdLabel: t.compound(pos(1000, 328)),
    slowS11Label: t.compound(pos(660, 360)),
    fastStdLabel: t.compound(pos(760, 510)),
    fastS11Label: t.compound(pos(800, 374)),
    spikeLabel: t.compound(pos(740, 207)),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: stride 1×1
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: standard
    pointRadius: t.number(4.5, { range: [1, 14] }),
    lineWidth: t.number(2.2, { range: [1, 6] }),
    crossSize: t.number(6, { range: [2, 14] }),
    starSize: t.number(11, { range: [4, 24] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), sweepDraw: progress(), crosses: progress(), best: progress(),
    shrink: progress(), marker: progress(), slowIn: progress(0), slowDraw: progress(), pick: progress(),
    fastIn: progress(), fastDraw: progress(), spike: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const text = (parent: Element, s: string, attrs: Record<string, string | number> = {}) => {
    const e = el('text', { ...LABEL, 'font-size': 13, ...attrs }, parent)
    e.textContent = s
    return e
  }
  // One plot frame: gridlines, axes, tick labels, axis titles, heading, then a group for the data.
  const frame = (ax: Axis, ay: Axis, xTitle: string, yTitle: string, heading: string) => {
    const g = el('g')
    const grid = { stroke: '#2e2e2b', 'stroke-width': 1 }, axis = { stroke: '#3a3a37', 'stroke-width': 1.5 }
    const gridX = ax.ticks.map(() => el('line', grid, g)), gridY = ay.ticks.map(() => el('line', grid, g))
    const axX = el('line', axis, g), axY = el('line', axis, g)
    const tickX = ax.ticks.map(([, s]) => text(g, s, { 'text-anchor': 'middle' }))
    const tickY = ay.ticks.map(([, s]) => text(g, s, { 'text-anchor': 'end' }))
    const labX = text(g, xTitle, { 'font-size': 14, 'text-anchor': 'middle' })
    const labY = text(g, yTitle, { 'font-size': 14, 'text-anchor': 'middle' })
    const head = text(g, heading, { 'font-size': 14, fill: '#ededea' })
    return { g, ax, ay, gridX, gridY, axX, axY, tickX, tickY, labX, labY, head, data: el('g', {}, g) }
  }
  type Frame = ReturnType<typeof frame>
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }

  // the learning-rate sweep
  const sweep = frame(SWEEP_X, SWEEP_Y, 'BASE LEARNING RATE', 'TEST ERROR RATE', '')
  const sweepStdPath = el('path', curve, sweep.data), sweepS11Path = el('path', curve, sweep.data)
  const stdDots = sweepStd.map(() => el('circle', {}, sweep.data))
  const s11Dots = S11_ERR.map(() => el('circle', {}, sweep.data))
  const crosses = UNSTABLE.map(() => el('path', { fill: 'none', 'stroke-linecap': 'round' }, sweep.data))
  const stars = [STD_BEST, S11_BEST].map(() => el('path', { fill: '#ededea' }, sweep.data))
  const sweepStdLabel = text(svg, 'STANDARD WIDERESNET', { 'text-anchor': 'end' })
  const sweepS11Label = text(svg, 'STRIDE 1×1 WIDERESNET', { 'text-anchor': 'middle' })
  const keyCross = text(svg, '× SIGNIFICANT TRAINING INSTABILITY')
  const keyStar = text(svg, '★ BEST LEARNING RATE')
  const marker = el('line', { stroke: '#ededea', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' })
  const markerText = text(svg, '', { fill: '#ededea', 'text-anchor': 'middle' })

  // train loss at lr 0.001 and at lr 0.1 (same box, one fades into the other)
  const slow = frame(STEP_X, SLOW_Y, 'GLOBAL STEP', 'TRAIN LOSS', 'TRAINING AT LEARNING RATE: 0.001')
  const fast = frame(STEP_X, FAST_Y, 'GLOBAL STEP', 'TRAIN LOSS', 'TRAINING AT LEARNING RATE: 0.1')
  const slowStdPath = el('path', curve, slow.data), slowS11Path = el('path', curve, slow.data)
  const fastStdPath = el('path', curve, fast.data), fastS11Path = el('path', curve, fast.data)
  const slowStdLabel = text(slow.data, 'STANDARD WIDERESNET'), slowS11Label = text(slow.data, 'STRIDE 1×1 WIDERESNET')
  const fastStdLabel = text(fast.data, 'STANDARD WIDERESNET'), fastS11Label = text(fast.data, 'STRIDE 1×1 WIDERESNET')
  const spikeLabel = text(fast.data, 'PEAK ≈ 78')

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  type Box = { x: number; y: number; w: number; h: number }
  /** Lays a frame out in box `r`; returns its data → screen maps. */
  const place = (f: Frame, r: Box) => {
    const X = (v: number) => r.x + unit(f.ax, v) * r.w
    const Y = (v: number) => r.y + r.h - unit(f.ay, v) * r.h
    f.ax.ticks.forEach(([v], i) => {
      set(f.gridX[i], { x1: X(v), y1: r.y, x2: X(v), y2: r.y + r.h })
      set(f.tickX[i], { x: X(v), y: r.y + r.h + 22 })
    })
    f.ay.ticks.forEach(([v], i) => {
      set(f.gridY[i], { x1: r.x, y1: Y(v), x2: r.x + r.w, y2: Y(v) })
      set(f.tickY[i], { x: r.x - 10, y: Y(v) + 4 })
    })
    set(f.axX, { x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h })
    set(f.axY, { x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h })
    set(f.labX, { x: r.x + r.w / 2, y: r.y + r.h + 50 })
    set(f.labY, { transform: `translate(${r.x - 58},${r.y + r.h / 2}) rotate(-90)` })
    set(f.head, { x: r.x, y: r.y - 14 })
    return { X, Y }
  }

  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const before = rgba(S.before), after = rgba(S.after)

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // slide 1: the sweep, full size; slides 2–3: the same sweep, small, with a marker at the learning rate shown
    const k = T.shrink, big = L.sweep, mini = L.sweepMini
    const r = { x: lerp(big.x, mini.x, k), y: lerp(big.y, mini.y, k), w: lerp(big.w, mini.w, k), h: lerp(big.h, mini.h, k) }
    const sw = place(sweep, r)
    set(sweep.g, { opacity: T.axesIn })
    const endX = lerp(sw.X(LRS[0]), sw.X(1), T.sweepDraw)
    const shown = (lr: number) => (T.sweepDraw > 0 && sw.X(lr) <= endX + 0.5 ? 1 : 0)
    set(sweepStdPath, { d: path(sweepStd, sw.X, sw.Y, endX), stroke: after, 'stroke-width': S.lineWidth, opacity: T.sweepDraw > 0 ? 1 : 0 })
    set(sweepS11Path, { d: path(sweepS11, sw.X, sw.Y, endX), stroke: before, 'stroke-width': S.lineWidth, opacity: T.sweepDraw > 0 ? 1 : 0 })
    sweepStd.forEach(([lr, e], i) => set(stdDots[i], { cx: sw.X(lr), cy: sw.Y(e), r: S.pointRadius, fill: after, opacity: shown(lr) }))
    S11_ERR.forEach((e, i) => {
      const unstable = UNSTABLE.includes(i)
      set(s11Dots[i], { cx: sw.X(LRS[i]), cy: sw.Y(e), r: S.pointRadius * (unstable ? 1 - T.crosses : 1), fill: before, opacity: shown(LRS[i]) })
    })
    UNSTABLE.forEach((i, j) => set(crosses[j], {
      d: cross(sw.X(LRS[i]), sw.Y(S11_ERR[i]), S.crossSize), stroke: before, 'stroke-width': S.lineWidth, opacity: T.crosses * shown(LRS[i]),
    }))
    set(stars[0], { d: star(sw.X(LRS[STD_BEST]), sw.Y(STD_ERR[STD_BEST]), S.starSize * T.best) })
    set(stars[1], { d: star(sw.X(LRS[S11_BEST]), sw.Y(S11_ERR[S11_BEST]), S.starSize * T.best) })
    // labels are placed for the full-size sweep and ride along (fading) as it shrinks
    const bigOnly = 1 - k
    const onSweep = (p: { x: number; y: number }, dy = 0) => ({ x: r.x + ((p.x - big.x) / big.w) * r.w, y: r.y + ((p.y + dy - big.y) / big.h) * r.h })
    set(sweepStdLabel, { ...onSweep(L.sweepStdLabel), fill: after, opacity: shown(1) * bigOnly })
    set(sweepS11Label, { ...onSweep(L.sweepS11Label), fill: before, opacity: shown(0.1) * bigOnly })
    set(keyCross, { ...onSweep(L.key), opacity: T.crosses * bigOnly })
    set(keyStar, { ...onSweep(L.key, 22), opacity: T.best * bigOnly })
    const mx = lerp(sw.X(LRS[0]), sw.X(LRS[6]), T.pick) // lr 0.001 → lr 0.1
    set(marker, { x1: mx, y1: r.y, x2: mx, y2: r.y + r.h, opacity: T.marker })
    set(markerText, { x: mx, y: r.y - 10, opacity: T.marker })
    markerText.textContent = T.pick < 0.5 ? 'LR 0.001' : 'LR 0.1'

    // slides 2–3: train loss at the marked learning rate
    const sl = place(slow, L.loss), fa = place(fast, L.loss)
    set(slow.g, { opacity: T.slowIn }); set(fast.g, { opacity: T.fastIn })
    const slowEnd = lerp(sl.X(1), sl.X(LAST_STEP), T.slowDraw), fastEnd = lerp(fa.X(1), fa.X(LAST_STEP), T.fastDraw)
    const slowOn = T.slowDraw > 0 ? 1 : 0, fastOn = T.fastDraw > 0 ? 1 : 0
    set(slowStdPath, { d: path(SLOW_STD, sl.X, sl.Y, slowEnd), stroke: after, 'stroke-width': S.lineWidth, opacity: slowOn })
    set(slowS11Path, { d: path(SLOW_S11, sl.X, sl.Y, slowEnd), stroke: before, 'stroke-width': S.lineWidth, opacity: slowOn })
    set(fastStdPath, { d: path(FAST_STD, fa.X, fa.Y, fastEnd), stroke: after, 'stroke-width': S.lineWidth, opacity: fastOn })
    set(fastS11Path, { d: path(FAST_S11, fa.X, fa.Y, fastEnd), stroke: before, 'stroke-width': S.lineWidth, opacity: fastOn })
    // each label shows once the drawing reaches it
    const reached = (p: { x: number }, endX: number, on: number) => (on && endX >= p.x ? 1 : 0)
    set(slowStdLabel, { x: L.slowStdLabel.x, y: L.slowStdLabel.y, fill: after, opacity: reached(L.slowStdLabel, slowEnd, slowOn) })
    set(slowS11Label, { x: L.slowS11Label.x, y: L.slowS11Label.y, fill: before, opacity: reached(L.slowS11Label, slowEnd, slowOn) })
    set(fastStdLabel, { x: L.fastStdLabel.x, y: L.fastStdLabel.y, fill: after, opacity: reached(L.fastStdLabel, fastEnd, fastOn) })
    set(fastS11Label, { x: L.fastS11Label.x, y: L.fastS11Label.y, fill: before, opacity: reached(L.fastS11Label, fastEnd, fastOn) })
    set(spikeLabel, { x: L.spikeLabel.x, y: L.spikeLabel.y, fill: before, opacity: T.spike })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Stride instability'
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

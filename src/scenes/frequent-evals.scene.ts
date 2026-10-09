// Frequent-evals explainer: evals every 1000 steps look like normal training → evaluating every step at the start
// reveals a loss spike → the spike fits inside one eval interval, so coarse evals miss it. Data traced from the original figure.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/frequent-evals/), export the JSON to src/scenes/frequent-evals.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./frequent-evals.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once frequent-evals.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18.5, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18.5, 0], [19.3, 1]],
    coarseIn: [[0.2, 0], [1.2, 1], [9, 1], [10, 0]], // the every-1000-steps view, then it fades out
    coarseDraw: [[1.2, 0], [6.5, 1]],
    fineIn: [[10, 0], [11, 1]], // the every-step view of the first 28 steps
    fineDraw: [[11.2, 0], [16.5, 1]],
    peak: [[12.6, 0], [13.4, 1]],
    band: [[19.5, 0], [21, 1]], // how long the spike lasts
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
type Pt = [x: number, y: number]
// Traced from google-research/tuning_playbook assets/more_frequent_evals.png (CC BY 4.0).
// Accuracy ≈ ±1 px of the 960×416 original: ±40 steps and ±0.03 loss (left), ±0.5 loss (right).
// Left panel, "Eval every 1000 steps": train loss vs global step, as [step, loss].
const COARSE_22: Pt[] = [ // conv stride (2, 2)
  [177, 1.91], [195, 1.84], [213, 1.89], [231, 1.8], [267, 1.73], [285, 1.75], [303, 1.68], [330, 1.75],
  [438, 1.67], [474, 1.67], [546, 1.6], [618, 1.55], [654, 1.55], [690, 1.57], [726, 1.57], [762, 1.54],
  [869, 1.53], [941, 1.49], [977, 1.48], [1157, 1.4], [1265, 1.44], [1301, 1.42], [1373, 1.41], [1516, 1.35],
  [1660, 1.37], [1696, 1.37], [1732, 1.35], [1804, 1.34], [2055, 1.26], [2307, 1.25], [2379, 1.23], [2451, 1.23],
  [2810, 1.23], [2846, 1.21], [3313, 1.21], [3349, 1.19], [3421, 1.18], [3565, 1.14], [3601, 1.12], [3853, 1.12],
  [3888, 1.13], [3996, 1.13], [4068, 1.12], [4715, 1.11], [5003, 1.09], [5039, 1.07], [5218, 1.06], [5254, 1.05],
  [5973, 1.04], [6045, 1.02], [6512, 1.02], [6584, 1], [6872, 0.993], [6908, 0.978], [7375, 0.969], [7411, 0.955],
  [8741, 0.947], [8813, 0.932], [9460, 0.925], [9603, 0.908], [10178, 0.901], [10250, 0.885], [11005, 0.878], [11077, 0.862],
  [12443, 0.854], [12551, 0.839], [14635, 0.836],
]
const COARSE_11: Pt[] = [ // conv stride (1, 1); starts at the top of the axis (5)
  [186, 4.97], [474, 4.79], [869, 4.42], [1121, 4.27], [1696, 3.95], [2271, 3.68], [2451, 3.62], [2918, 3.41],
  [3277, 3.27], [3601, 3.13], [3960, 3], [4392, 2.88], [4787, 2.75], [5326, 2.62], [5901, 2.47], [6404, 2.37],
  [7195, 2.25], [7698, 2.16], [9388, 1.98], [9891, 1.95], [10322, 1.91], [11113, 1.88], [11364, 1.86], [11688, 1.86],
  [11940, 1.84], [12335, 1.83], [12551, 1.81], [13162, 1.81], [13449, 1.79], [14060, 1.79], [14420, 1.77], [14671, 1.77],
]
// Right panel, every step: train loss at steps 1 … 28 (the axis ends at ~29 despite the "first 100 steps" title).
const FINE_22 = [2.83, 3.02, 3, 2.66, 2.65, 2.84, 2.64, 2.63, 2.63, 2.56, 2.64, 2.64, 2.63, 2.54, 2.57, 2.57, 2.58, 2.56, 2.55, 2.58, 2.61, 2.56, 2.5, 2.53, 2.56, 2.56, 2.56, 2.56]
const FINE_11 = [2.83, 51.2, 61.3, 101, 93.9, 100, 59.8, 25.9, 14.4, 7.83, 5.13, 4.38, 3.68, 4.12, 4.77, 5.96, 7.09, 6.2, 5.6, 5.32, 5.15, 4.92, 4.67, 4.8, 4.86, 4.86, 4.85, 4.84]
const fine22: Pt[] = FINE_22.map((l, i): Pt => [i + 1, l])
const fine11: Pt[] = FINE_11.map((l, i): Pt => [i + 1, l])
const SPIKE: Pt = [1, 11] // steps over which the (1, 1) loss leaves and returns to ~5

// Axes keep the original ranges and ticks (both panels are linear).
type Axis = { min: number; max: number; ticks: number[] }
const COARSE_X: Axis = { min: -496, max: 15390, ticks: [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000] }
const COARSE_Y: Axis = { min: 0, max: 5, ticks: [0, 1, 2, 3, 4, 5] }
const FINE_X: Axis = { min: -0.35, max: 29.4, ticks: [0, 5, 10, 15, 20, 25] }
const FINE_Y: Axis = { min: 0, max: 110, ticks: [0, 20, 40, 60, 80, 100] }
const unit = (a: Axis, v: number) => (v - a.min) / (a.max - a.min)

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

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['Eval every 1000 steps', 'conv stride (2, 2) vs (1, 1) · train loss', 'On a common eval schedule, both runs look like normal training: the loss just falls.'],
  ['Now evaluate every step', 'the first 28 steps, one eval per step', 'The (1, 1) run’s loss jumps from ~3 to ~100 by step 4, then falls back to ~5 by step 11.'],
  ['Hidden between evals', 'check: ~500 steps at 2× the best lr, eval every step', 'The spike is over in ~10 steps, far inside one 1000-step eval interval, so it goes unseen.'],
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
  const project = getProject('AtoZAI · Frequent Evals', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(170, 170), w: t.number(960, { range: [300, 1100] }), h: t.number(390, { range: [150, 480] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    coarse22Label: t.compound(pos(880, 522)),
    coarse11Label: t.compound(pos(880, 393)),
    fine22Label: t.compound(pos(232, 538)),
    fine11Label: t.compound(pos(420, 232)),
    peakLabel: t.compound(pos(296, 198)),
    bandLabel: t.compound(pos(545, 300)),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: conv stride (1, 1)
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: conv stride (2, 2)
    pointRadius: t.number(3, { range: [0, 10] }),
    lineWidth: t.number(2.2, { range: [1, 6] }),
    bandOpacity: t.number(0.14, { range: [0, 0.5] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), coarseIn: progress(0), coarseDraw: progress(), fineIn: progress(), fineDraw: progress(),
    peak: progress(), band: progress(),
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
  const frame = (ax: Axis, ay: Axis, heading: string) => {
    const g = el('g')
    const grid = { stroke: '#2e2e2b', 'stroke-width': 1 }, axis = { stroke: '#3a3a37', 'stroke-width': 1.5 }
    const gridX = ax.ticks.map(() => el('line', grid, g)), gridY = ay.ticks.map(() => el('line', grid, g))
    const axX = el('line', axis, g), axY = el('line', axis, g)
    const tickX = ax.ticks.map(v => text(g, String(v), { 'text-anchor': 'middle' }))
    const tickY = ay.ticks.map(v => text(g, String(v), { 'text-anchor': 'end' }))
    const labX = text(g, 'GLOBAL STEP', { 'font-size': 14, 'text-anchor': 'middle' })
    const labY = text(g, 'TRAIN LOSS', { 'font-size': 14, 'text-anchor': 'middle' })
    const head = text(g, heading, { 'font-size': 14, fill: '#ededea' })
    return { g, ax, ay, gridX, gridY, axX, axY, tickX, tickY, labX, labY, head, data: el('g', {}, g) }
  }
  type Frame = ReturnType<typeof frame>
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }

  const coarse = frame(COARSE_X, COARSE_Y, 'EVAL EVERY 1000 STEPS')
  const coarse22Path = el('path', curve, coarse.data), coarse11Path = el('path', curve, coarse.data)
  const coarse22Label = text(coarse.data, 'CONV STRIDE (2, 2)'), coarse11Label = text(coarse.data, 'CONV STRIDE (1, 1)')

  const fine = frame(FINE_X, FINE_Y, 'EVERY STEP · FIRST 28 STEPS')
  const band = el('rect', {}, fine.data)
  const bandLabel = text(fine.data, '← SPIKE OVER IN ≈ 10 STEPS', { fill: '#ededea' })
  const fine22Path = el('path', curve, fine.data), fine11Path = el('path', curve, fine.data)
  const fine22Dots = fine22.map(() => el('circle', {}, fine.data)), fine11Dots = fine11.map(() => el('circle', {}, fine.data))
  const fine22Label = text(fine.data, 'CONV STRIDE (2, 2)'), fine11Label = text(fine.data, 'CONV STRIDE (1, 1)')
  const peakLabel = text(fine.data, 'LOSS ≈ 100', { 'text-anchor': 'end' })

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  type Box = { x: number; y: number; w: number; h: number }
  /** Lays a frame out in box `r`; returns its data → screen maps. */
  const place = (f: Frame, r: Box) => {
    const X = (v: number) => r.x + unit(f.ax, v) * r.w
    const Y = (v: number) => r.y + r.h - unit(f.ay, v) * r.h
    f.ax.ticks.forEach((v, i) => {
      set(f.gridX[i], { x1: X(v), y1: r.y, x2: X(v), y2: r.y + r.h })
      set(f.tickX[i], { x: X(v), y: r.y + r.h + 22 })
    })
    f.ay.ticks.forEach((v, i) => {
      set(f.gridY[i], { x1: r.x, y1: Y(v), x2: r.x + r.w, y2: Y(v) })
      set(f.tickY[i], { x: r.x - 10, y: Y(v) + 4 })
    })
    set(f.axX, { x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h })
    set(f.axY, { x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h })
    set(f.labX, { x: r.x + r.w / 2, y: r.y + r.h + 50 })
    set(f.labY, { transform: `translate(${r.x - 50},${r.y + r.h / 2}) rotate(-90)` })
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

    // slide 1: train loss logged every 1000 steps
    const c = place(coarse, L.plot)
    set(coarse.g, { opacity: T.coarseIn })
    const cEnd = lerp(c.X(COARSE_22[0][0]), c.X(COARSE_11[COARSE_11.length - 1][0]), T.coarseDraw), cOn = T.coarseDraw > 0 ? 1 : 0
    set(coarse22Path, { d: path(COARSE_22, c.X, c.Y, cEnd), stroke: after, 'stroke-width': S.lineWidth, opacity: cOn })
    set(coarse11Path, { d: path(COARSE_11, c.X, c.Y, cEnd), stroke: before, 'stroke-width': S.lineWidth, opacity: cOn })
    // each label shows once the drawing reaches it
    const reached = (p: { x: number }, endX: number, on: number) => (on && endX >= p.x ? 1 : 0)
    set(coarse22Label, { x: L.coarse22Label.x, y: L.coarse22Label.y, fill: after, opacity: reached(L.coarse22Label, cEnd, cOn) })
    set(coarse11Label, { x: L.coarse11Label.x, y: L.coarse11Label.y, fill: before, opacity: reached(L.coarse11Label, cEnd, cOn) })

    // slides 2–3: every step of the first 28
    const f = place(fine, L.plot)
    set(fine.g, { opacity: T.fineIn })
    const fEnd = lerp(f.X(1), f.X(fine11.length), T.fineDraw), fOn = T.fineDraw > 0 ? 1 : 0
    set(fine22Path, { d: path(fine22, f.X, f.Y, fEnd), stroke: after, 'stroke-width': S.lineWidth, opacity: fOn })
    set(fine11Path, { d: path(fine11, f.X, f.Y, fEnd), stroke: before, 'stroke-width': S.lineWidth, opacity: fOn })
    const dot = (e: Element, [s, l]: Pt, fill: string) =>
      set(e, { cx: f.X(s), cy: f.Y(l), r: S.pointRadius, fill, opacity: fOn && f.X(s) <= fEnd + 0.5 ? 1 : 0 })
    fine22.forEach((p, i) => dot(fine22Dots[i], p, after))
    fine11.forEach((p, i) => dot(fine11Dots[i], p, before))
    set(fine22Label, { x: L.fine22Label.x, y: L.fine22Label.y, fill: after, opacity: reached(L.fine22Label, fEnd, fOn) })
    set(fine11Label, { x: L.fine11Label.x, y: L.fine11Label.y, fill: before, opacity: reached(L.fine11Label, fEnd, fOn) })
    set(peakLabel, { x: L.peakLabel.x, y: L.peakLabel.y, fill: before, opacity: T.peak })

    // slide 3: the whole spike fits in a sliver of steps
    const bx0 = f.X(SPIKE[0]), bx1 = f.X(SPIKE[1])
    set(band, { x: bx0, y: L.plot.y, width: bx1 - bx0, height: L.plot.h, fill: before, opacity: S.bandOpacity * T.band })
    set(bandLabel, { x: L.bandLabel.x, y: L.bandLabel.y, opacity: T.band })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Frequent early evals'
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

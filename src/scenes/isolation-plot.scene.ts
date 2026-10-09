// Isolation plot explainer: five best-of-20 points appear → compared apples to apples → the best weight decay
// (≈ 3×10⁻⁵) is the one to test against a no-decay baseline.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/isolation-plot/), export the JSON to src/scenes/isolation-plot.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./isolation-plot.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once isolation-plot.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    p1: [[1.6, 0], [2.2, 1]],
    p2: [[2.4, 0], [3, 1]],
    p3: [[3.2, 0], [3.8, 1]],
    p4: [[4, 0], [4.6, 1]],
    p5: [[4.8, 0], [5.4, 1]],
    bestOf: [[5.8, 0], [6.8, 1], [9, 1], [9.6, 0]],
    values: [[10, 0], [11.5, 1]],
    worst: [[12.5, 0], [13.5, 1]],
    dimOthers: [[18.6, 0], [19.6, 1]],
    best: [[19.6, 0, 'ease'], [20.6, 1]],
    guide: [[21, 0], [22.5, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
// Traced from google-research/tuning_playbook assets/basic_isolation_plot.png (CC BY 4.0), the higher-resolution
// version of assets/isolation_plot.png (same five points). ResNet-50 on ImageNet; each point is the best validation
// error over 20 learning rates at that weight decay. The 20 individual trials are not published, so they are not drawn.
// [weight decay, best validation error rate]; weight decays sit 1.25 decades apart (10⁻⁷ … 10⁻²).
const POINTS: [number, number][] = [
  [1e-7, 0.285],
  [1.78e-6, 0.252],
  [3.16e-5, 0.234],
  [5.62e-4, 0.247],
  [1e-2, 0.483],
]
const BEST = POINTS.reduce((b, p, i) => (p[1] < POINTS[b][1] ? i : b), 0)
const WORST = POINTS.reduce((b, p, i) => (p[1] > POINTS[b][1] ? i : b), 0)
// Axis ranges and ticks of the original figure: log x from 10^-7.25 to 10^-1.75.
const LOG_MIN = -7.25, LOG_MAX = -1.75, Y_MIN = 0.222, Y_MAX = 0.496
const X_TICKS = [-7, -6, -5, -4, -3, -2], Y_TICKS = [0.25, 0.3, 0.35, 0.4, 0.45]
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const pow10 = (e: number) => `10${String(e).split('').map(c => SUP[c]).join('')}`
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['Isolation plot', 'ResNet-50 · ImageNet · 5 weight decay values', 'Each dot is the best of 20 trials, so the learning rate is tuned away at every value.'],
  ['Apples to apples', 'same 20-learning-rate search behind every dot', 'Error dips from 28.5% to 23.4%, then climbs; at 10⁻² it jumps to 48.3%.'],
  ['Best weight decay ≈ 3×10⁻⁵', 'the value to test against no weight decay', 'To decide on weight decay at all, compare 23.4% with an equally well-tuned no-decay baseline.'],
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
  const project = getProject('AtoZAI · Isolation Plot', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const offset = (dx: number, dy: number) => ({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(230, 170), width: t.number(880, { range: [300, 1100] }), height: t.number(420, { range: [150, 470] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    bestOfLabel: t.compound(offset(18, -22)), // from the first point
    valueLabel: t.compound(offset(0, -18)), // from each point
    bestLabel: t.compound(offset(0, -10)), // from the right end of the best-value guide
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: the worst value
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: guides to the best value
    point: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 1 }), // the points
    pointRadius: t.number(7, { range: [2, 16] }),
    starRadius: t.number(14, { range: [4, 30] }),
    dimTo: t.number(0.35, { range: [0, 1] }), // opacity of the other points on slide 3
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), p1: progress(), p2: progress(), p3: progress(), p4: progress(), p5: progress(),
    bestOf: progress(0), values: progress(), worst: progress(), dimOthers: progress(), best: progress(), guide: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const gPlot = el('g')
  const gAxes = el('g', {}, gPlot)
  const gridX = X_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const gridY = Y_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const axX = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes), axY = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)
  const tickX = X_TICKS.map(e => { const n = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gAxes); n.textContent = pow10(e); return n })
  const tickY = Y_TICKS.map(v => { const n = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes); n.textContent = v.toFixed(2); return n })
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'WEIGHT DECAY'; labY.textContent = 'BEST VALIDATION ERROR RATE'
  const guideH = el('line', { 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, gPlot)
  const guideV = el('line', { 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, gPlot)
  const guideTick = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gPlot)
  guideTick.textContent = `3×${pow10(-5)}`
  const dots = POINTS.map(() => el('circle', {}, gPlot))
  const values = POINTS.map(([, err]) => { const n = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gPlot); n.textContent = pct(err); return n })
  const star = el('polygon', { 'stroke-linejoin': 'round' }, gPlot)
  const bestOfText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  bestOfText.textContent = 'BEST OF 20 LEARNING RATES'
  const bestText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gPlot)
  bestText.textContent = `LOWEST ERROR · ${pct(POINTS[BEST][1])}`

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot
    const XL = (lg: number) => px + ((lg - LOG_MIN) / (LOG_MAX - LOG_MIN)) * w // x from log10(weight decay)
    const X = (wd: number) => XL(Math.log10(wd))
    const Y = (v: number) => py + h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * h

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // axes: log x (10⁻⁷ … 10⁻²), linear y, faint major gridlines
    set(gAxes, { opacity: T.axesIn })
    set(axX, { x1: px, y1: py + h, x2: px + w, y2: py + h })
    set(axY, { x1: px, y1: py + h, x2: px, y2: py })
    X_TICKS.forEach((e, i) => {
      set(gridX[i], { x1: XL(e), y1: py, x2: XL(e), y2: py + h })
      set(tickX[i], { x: XL(e), y: py + h + 24 })
    })
    Y_TICKS.forEach((v, i) => {
      set(gridY[i], { x1: px, y1: Y(v), x2: px + w, y2: Y(v) })
      set(tickY[i], { x: px - 10, y: Y(v) + 4 })
    })
    set(labX, { x: px + w / 2, y: py + h + 48 })
    set(labY, { transform: `translate(${px - 66},${py + h / 2}) rotate(-90)` })

    // slide 1: the five best-of-20 points appear left to right
    const pIn = [T.p1, T.p2, T.p3, T.p4, T.p5]
    POINTS.forEach(([wd, err], i) => {
      const isWorst = i === WORST, isBest = i === BEST
      const alpha = isBest ? 1 - T.best : lerp(1, S.dimTo, T.dimOthers)
      const fill = isWorst && T.worst > 0.5 ? S.before : S.point
      set(dots[i], { cx: X(wd), cy: Y(err), r: S.pointRadius * pIn[i], fill: rgba(fill), opacity: alpha })
      // slide 2: every point's value; the worst one turns orange
      set(values[i], {
        x: X(wd) + L.valueLabel.dx, y: Y(err) + L.valueLabel.dy,
        fill: isWorst && T.worst > 0.5 ? rgba(S.before) : isBest ? '#ededea' : '#8d8c86',
        opacity: T.values * (isBest ? 1 : alpha),
      })
    })
    const [wd0, err0] = POINTS[0]
    set(bestOfText, { x: X(wd0) + L.bestOfLabel.dx, y: Y(err0) + L.bestOfLabel.dy, opacity: T.bestOf })

    // slide 3: a star on the lowest error, with guides to its value and its weight decay
    const [wdB, errB] = POINTS[BEST]
    const bx = X(wdB), by = Y(errB), R = S.starRadius * T.best
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * 0.45 : R
      return `${(bx + r * Math.cos(a)).toFixed(1)},${(by + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
    set(star, { points: pts, fill: '#ededea', opacity: T.best > 0 ? 1 : 0 })
    set(bestText, { x: px + w + L.bestLabel.dx, y: by + L.bestLabel.dy, fill: rgba(S.after), opacity: T.guide })
    const gx = lerp(px, px + w, T.guide)
    set(guideH, { x1: px, y1: by, x2: gx, y2: by, stroke: rgba(S.after), opacity: T.guide > 0 ? 1 : 0 })
    set(guideV, { x1: bx, y1: by + S.starRadius, x2: bx, y2: lerp(by + S.starRadius, py + h, T.guide), stroke: rgba(S.after), opacity: T.guide > 0 ? 1 : 0 })
    set(guideTick, { x: bx, y: py + h + 24, fill: rgba(S.after), opacity: T.guide })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Isolation plot'
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

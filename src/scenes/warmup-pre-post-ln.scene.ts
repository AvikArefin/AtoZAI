// Warmup with Pre-LN vs Post-LN explainer: without warmup both break past some learning rate → warmup moves the break point right → so the best LR moves right.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/warmup-pre-post-ln/), export the JSON to src/scenes/warmup-pre-post-ln.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./warmup-pre-post-ln.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 27 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once warmup-pre-post-ln.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    postDraw: [[1.2, 0], [4, 1]],
    postLabel: [[3.2, 0], [4, 1]],
    preDraw: [[4.2, 0], [7, 1]],
    preLabel: [[6.2, 0], [7, 1]],
    keyIn: [[7, 0], [7.8, 1]],
    postWarmDraw: [[9.6, 0], [12.4, 1]],
    postWarmLabel: [[11.6, 0], [12.4, 1]],
    preWarmDraw: [[12.6, 0], [15.4, 1]],
    preWarmLabel: [[14.6, 0], [15.4, 1]],
    dim: [[18.4, 0], [19.4, 1]],
    guides: [[19.2, 0], [19.8, 1]],
    shift: [[19.8, 0, 'ease'], [21.8, 1]],
    shiftLabels: [[21.8, 0], [22.6, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: traced from the original figure, computed once ----------
// Validation loss at step 76 619 against base learning rate, 6-layer transformer on WMT14 En–De.
// Traced from google-research/tuning_playbook assets/beneficial_effect_warmup.png (CC BY 4.0).
// The sweep is ten log-spaced learning rates, 10^(−4 + 2k/9) (the markers sit on that grid to < 1 px).
// Losses are marker centres, good to about ±1 px of the 470 px tall original (≈ ±0.5 %). In the original the
// PostLN + warmup points at 1.0, 1.67 and 2.78×10⁻⁴ (and PreLN at 10⁻⁴) are hidden under other markers;
// those are read from the visible line segments (±2 px). Poor-optimisation (×) and best-LR (star) flags
// are copied from the figure.
const LRS = [1e-4, 1.67e-4, 2.78e-4, 4.64e-4, 7.74e-4, 1.29e-3, 2.15e-3, 3.59e-3, 5.99e-3, 1e-2]
type Series = { loss: number[]; poor: number[]; best: number; pre: boolean; warmup: boolean }
const SERIES: Series[] = [
  { // PostLN
    loss: [1.84, 11.0, 10.3, 9.78, 9.41, 9.58, 9.62, 8.71, 8.66, 7.28],
    poor: [1, 2, 3, 4, 5, 6, 7, 8, 9], best: 0, pre: false, warmup: false,
  },
  { // PreLN
    loss: [1.84, 1.75, 1.68, 1.63, 1.6, 1.6, 5.98, 5.96, 6.27, 6.16],
    poor: [6, 7, 8, 9], best: 5, pre: true, warmup: false,
  },
  { // PostLN + LR warmup
    loss: [1.89, 1.78, 1.74, 1.72, 10.2, 9.73, 9.64, 9.79, 9.32, 7.28],
    poor: [4, 5, 6, 7, 8, 9], best: 3, pre: false, warmup: true,
  },
  { // PreLN + LR warmup
    loss: [1.91, 1.8, 1.73, 1.7, 1.64, 1.63, 1.63, 1.62, 2.25, 4.33],
    poor: [8, 9], best: 7, pre: true, warmup: true,
  },
]
// Everything is plotted in log10 space, as in the original (log–log axes).
type Pt = [x: number, y: number]
const PTS: Pt[][] = SERIES.map(s => s.loss.map((l, k): Pt => [Math.log10(LRS[k]), Math.log10(l)]))
const X0 = Math.log10(LRS[0]), X1 = Math.log10(LRS[LRS.length - 1])

/** The part of a polyline (x increasing) left of x = xMax, ending exactly at xMax so drawing is continuous. */
const upTo = (pts: Pt[], xMax: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (p[0] <= xMax + 1e-9) { out.push(p); continue }
    if (i > 0) { const q = pts[i - 1]; out.push([xMax, lerp(q[1], p[1], (xMax - q[0]) / (p[0] - q[0]))]) }
    break
  }
  return out
}
// How far the best LR moves with warmup: [series without warmup, series with warmup]
const SHIFTS: [number, number][] = [[0, 2], [1, 3]]
const ratio = ([a, b]: [number, number]) => LRS[SERIES[b].best] / LRS[SERIES[a].best]

// Axis ranges (log10) and tick labels, as in the original figure.
const AX = { x0: -4.098, x1: -1.902, y0: 0.1607, y1: 1.0849 }
type Tick = [at: number, text: string]
const XT: Tick[] = [[-4, '10⁻⁴'], [-3, '10⁻³'], [-2, '10⁻²']]
const YT: Tick[] = [[Math.log10(2), '2×10⁰'], [Math.log10(3), '3×10⁰'], [Math.log10(4), '4×10⁰'], [Math.log10(6), '6×10⁰'], [1, '10¹']]

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['Where training breaks', '6-layer transformer · WMT14 En–De · no warmup', 'Without warmup, PostLN breaks just above 10⁻⁴ and PreLN at about 2×10⁻³.'],
  ['Warmup moves the edge right', 'same sweep, with learning-rate warmup', 'With warmup, both stay stable at higher learning rates, so the best LR moves right.'],
  ['The best LR moves right', 'stars: best learning rate per run', `Warmup raised the best learning rate ${ratio(SHIFTS[0]).toFixed(1)}× for PostLN and ${ratio(SHIFTS[1]).toFixed(1)}× for PreLN.`],
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
  const project = getProject('AtoZAI · Warmup Pre vs Post LN', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(170, 165), width: t.number(1010, { range: [300, 1100] }), height: t.number(425, { range: [150, 475] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    postLabel: t.compound(pos(432, 186)),
    preLabel: t.compound(pos(842, 290)),
    postWarmLabel: t.compound(pos(594, 390)),
    preWarmLabel: t.compound(pos(1072, 474)),
    key: t.compound(pos(1012, 545)), // "× poor optimisation / ★ best LR"
    shiftRow: t.number(2.5, { range: [2, 5] }), // loss level (axis units) of the best-LR arrows
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: PostLN
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: PreLN
    star: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 1 }), // best LR
    lineWidth: t.number(2, { range: [1, 6] }),
    warmupOpacity: t.number(0.7, { range: [0, 1] }), // "+ warmup" runs: lighter …
    warmupDash: t.number(6, { range: [0, 20] }), // … and dashed
    pointRadius: t.number(3.5, { range: [1, 10] }),
    crossSize: t.number(5, { range: [2, 12] }),
    starSize: t.number(9, { range: [4, 20] }),
    dimTo: t.number(0.3, { range: [0, 1] }), // curves on slide 3, behind the stars
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), postDraw: progress(), postLabel: progress(), preDraw: progress(),
    preLabel: progress(), keyIn: progress(), postWarmDraw: progress(), postWarmLabel: progress(),
    preWarmDraw: progress(), preWarmLabel: progress(), dim: progress(), guides: progress(), shift: progress(),
    shiftLabels: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const text = (s: string, attrs: Record<string, string | number> = {}, parent: Element = svg) => {
    const e = el('text', { ...LABEL, 'font-size': 13, ...attrs }, parent)
    e.textContent = s
    return e
  }

  // axes: gridlines at the labelled ticks, two axis lines, tick labels and axis names
  const gAxes = el('g')
  const gridX = XT.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const gridY = YT.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const axX = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes), axY = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)
  const tickX = XT.map(([, s]) => text(s, { 'text-anchor': 'middle' }, gAxes))
  const tickY = YT.map(([, s]) => text(s, { 'text-anchor': 'end' }, gAxes))
  const nameX = text('BASE LEARNING RATE', { 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const nameY = text('VALIDATION LOSS AT STEP 76619', { 'font-size': 14, 'text-anchor': 'middle' }, gAxes)

  // best-LR guides and arrows (slide 3), under the curves' markers
  const guide = { 'stroke-width': 1.5, 'stroke-dasharray': '3 5', fill: 'none' }
  const shiftGuides = SHIFTS.map(() => [el('line', guide), el('line', guide)])
  const shiftArrows = SHIFTS.map(() => el('path', { fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }))
  const shiftTexts = SHIFTS.map(s => text(`BEST LR ×${ratio(s).toFixed(1)}`, { 'text-anchor': 'middle' }))

  // series: line, a dot per good point, a × per poorly optimised point, a star at the best LR
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const lines = SERIES.map(() => el('path', curve))
  const marks = SERIES.map(s => s.loss.map((_, k) =>
    s.poor.includes(k) ? el('path', { fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' }) : el('circle')))
  const stars = SERIES.map(() => el('polygon', { 'stroke-linejoin': 'round' }))
  const labels = ['POSTLN', 'PRELN', 'POSTLN + WARMUP', 'PRELN + WARMUP'].map(s => text(s))

  // key for the markers
  const gKey = el('g')
  const keyCross = el('path', { fill: 'none', stroke: '#8d8c86', 'stroke-width': 2, 'stroke-linecap': 'round' }, gKey)
  const keyStar = el('polygon', {}, gKey)
  const keyCrossText = text('POOR OPTIMIZATION', {}, gKey), keyStarText = text('BEST LR', {}, gKey)

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  const starPoints = (cx: number, cy: number, r: number) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r
      return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  const cross = (x: number, y: number, s: number) => `M${x - s} ${y - s} L${x + s} ${y + s} M${x - s} ${y + s} L${x + s} ${y - s}`

  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot
    const X = (x: number) => px + ((x - AX.x0) / (AX.x1 - AX.x0)) * w
    const Y = (y: number) => py + h - ((y - AX.y0) / (AX.y1 - AX.y0)) * h

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // axes
    set(gAxes, { opacity: T.axesIn })
    XT.forEach(([v], i) => { set(gridX[i], { x1: X(v), y1: py, x2: X(v), y2: py + h }); set(tickX[i], { x: X(v), y: py + h + 22 }) })
    YT.forEach(([v], i) => { set(gridY[i], { x1: px, y1: Y(v), x2: px + w, y2: Y(v) }); set(tickY[i], { x: px - 10, y: Y(v) + 4 }) })
    set(axX, { x1: px, y1: py + h, x2: px + w, y2: py + h })
    set(axY, { x1: px, y1: py, x2: px, y2: py + h })
    set(nameX, { x: px + w / 2, y: py + h + 48 })
    set(nameY, { transform: `translate(${px - 62},${py + h / 2}) rotate(-90)` })

    // series: each sweeps left to right; a marker appears once the line reaches it. Slide 3 dims all but the stars.
    const draws = [T.postDraw, T.preDraw, T.postWarmDraw, T.preWarmDraw]
    const labelOn = [T.postLabel, T.preLabel, T.postWarmLabel, T.preWarmLabel]
    const labelAt = [L.postLabel, L.preLabel, L.postWarmLabel, L.preWarmLabel]
    const dim = lerp(1, S.dimTo, T.dim)
    SERIES.forEach((s, i) => {
      const c = rgba(s.pre ? S.after : S.before), base = s.warmup ? S.warmupOpacity : 1
      const xMax = lerp(X0, X1, draws[i]), shown = upTo(PTS[i], xMax)
      set(lines[i], {
        d: shown.map(([x, y], j) => `${j ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' '),
        stroke: c, 'stroke-width': S.lineWidth, 'stroke-dasharray': s.warmup ? `${S.warmupDash} ${S.warmupDash * 0.8}` : 'none',
        opacity: base * dim,
      })
      PTS[i].forEach(([x, y], k) => {
        const on = draws[i] > 0 && x <= xMax + 1e-9 && k !== s.best ? base * dim : 0
        if (s.poor.includes(k)) set(marks[i][k], { d: cross(X(x), Y(y), S.crossSize), stroke: c, opacity: on })
        else set(marks[i][k], { cx: X(x), cy: Y(y), r: S.pointRadius, fill: c, opacity: on })
      })
      const [bx, by] = PTS[i][s.best]
      set(stars[i], {
        points: starPoints(X(bx), Y(by), S.starSize), fill: rgba(S.star), stroke: c, 'stroke-width': 1.5,
        opacity: draws[i] > 0 && bx <= xMax + 1e-9 ? 1 : 0,
      })
      set(labels[i], { x: labelAt[i].x, y: labelAt[i].y, fill: c, opacity: labelOn[i] * lerp(1, S.dimTo, T.dim) })
    })

    // key
    const { x: kx, y: ky } = L.key
    set(gKey, { opacity: T.keyIn })
    set(keyCross, { d: cross(kx + 5, ky - 4, S.crossSize) })
    set(keyCrossText, { x: kx + 18, y: ky })
    set(keyStar, { points: starPoints(kx + 5, ky + 18, S.starSize * 0.8), fill: rgba(S.star) })
    set(keyStarText, { x: kx + 18, y: ky + 22 })

    // slide 3: from each run's best LR without warmup to its best LR with warmup
    const row = Y(Math.log10(L.shiftRow))
    SHIFTS.forEach(([a, b], i) => {
      const c = rgba(SERIES[a].pre ? S.after : S.before)
      const xa = X(PTS[a][SERIES[a].best][0]), xb = X(PTS[b][SERIES[b].best][0])
      const ya = Y(PTS[a][SERIES[a].best][1]), yb = Y(PTS[b][SERIES[b].best][1])
      set(shiftGuides[i][0], { x1: xa, y1: ya - S.starSize - 4, x2: xa, y2: row, stroke: c, opacity: T.guides })
      set(shiftGuides[i][1], { x1: xb, y1: yb - S.starSize - 4, x2: xb, y2: row, stroke: c, opacity: T.guides })
      const tip = lerp(xa, xb, T.shift)
      set(shiftArrows[i], { d: `M${xa} ${row} L${tip} ${row} M${tip - 8} ${row - 5} L${tip} ${row} L${tip - 8} ${row + 5}`, stroke: c, opacity: T.shift > 0 ? 1 : 0 })
      set(shiftTexts[i], { x: (xa + xb) / 2, y: row - 12, fill: c, opacity: T.shiftLabels })
    })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Warmup, Pre-LN vs Post-LN'
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

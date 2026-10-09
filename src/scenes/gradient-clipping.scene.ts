// Gradient clipping explainer: huge early gradient spike → a threshold just above typical clips only the spike → one below typical clips every step.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/gradient-clipping/), export the JSON to src/scenes/gradient-clipping.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./gradient-clipping.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once gradient-clipping.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    spikeDraw: [[1.2, 0], [2.8, 1]],
    restDraw: [[2.8, 0], [6.5, 1]],
    normNotes: [[6.5, 0], [7.5, 1]],
    betterLine: [[9.5, 0], [11, 1]],
    betterClip: [[11.5, 0], [12.7, 1]],
    formula: [[13.5, 0], [14.5, 1]],
    dimBetter: [[18.5, 0], [19.5, 1]],
    aggrLine: [[19, 0], [20.5, 1]],
    aggrClip: [[21, 0], [23.5, 1]],
    aggrNote: [[24, 0], [25.2, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: real results, traced once ----------
// Traced from google-research/tuning_playbook assets/gradient_clipping.png (CC BY 4.0).
// Figure 9: [global step, grad L2 norm] of an unstable ResNet-200, plus the two clip thresholds the figure draws.
// The figure's callout pointers and threshold lines cover the curve for a few pixels at the crossings; those gaps are bridged straight.
type Pt = [step: number, norm: number]
const GRAD: Pt[] = [
  [0, 2.02e5], [451, 1.03e5], [648, 3.47e4], [839, 3.41e3], [1114, 2.09], [1309, 1.34],
  [1739, 0.923], [1962, 0.867], [2157, 0.85], [4159, 1.22], [4718, 1.29], [5284, 1.44],
  [5869, 1.49], [6834, 1.76], [8604, 2.01], [10163, 2.15], [10906, 2.46], [11515, 2.36],
  [12495, 2.33], [13475, 2.49], [14253, 2.5], [14634, 2.57], [15613, 2.48], [16389, 2.59],
  [17168, 2.48], [18176, 2.61], [18906, 3.09], [19102, 3.12], [19879, 2.67], [20273, 2.6],
  [22064, 2.73], [22834, 2.87], [23995, 2.75], [25151, 2.86], [26136, 2.73], [27121, 2.89],
  [28087, 2.8], [30037, 2.94], [31800, 2.8], [32771, 3.01], [34131, 2.79], [35706, 3.01],
  [38631, 2.95], [39608, 3.15], [43289, 3.17], [45638, 3.02], [47397, 3.28], [48359, 3.02],
  [50898, 3.23], [53827, 3.02], [55772, 3.24], [56757, 3.09], [57535, 3.3], [57916, 3.32],
  [60846, 3.02], [62022, 3.32], [63960, 3.16], [65532, 3.31], [66690, 3.24], [67860, 3.37],
  [69819, 3.25], [70979, 3.56], [72143, 3.35], [73904, 3.2], [76438, 3.4], [77023, 3.33],
  [79168, 3.4], [81118, 3.73], [82872, 3.4], [83837, 3.49], [84421, 3.35], [85602, 3.29],
  [86975, 3.52], [88916, 3.57], [90086, 3.74], [90668, 3.74], [92030, 3.33], [95740, 3.74],
  [97689, 3.56], [99054, 3.65], [101004, 3.5], [101719, 3.55],
]
const CLIP_LOW = 1.03 // "clip threshold too aggressive" line
const CLIP_HIGH = 4.15 // "better clip threshold" line
const STEP_MIN = -5060, STEP_MAX = 107000, NORM_MIN = 0.418, NORM_MAX = 3.99e5 // the original's axis ranges (y is log)
const STEP_TICKS = [0, 20000, 40000, 60000, 80000, 100000]
const NORM_TICKS: [number, string][] = [[0, '10⁰'], [1, '10¹'], [2, '10²'], [3, '10³'], [4, '10⁴'], [5, '10⁵']] // [log10, label]

// Everything below works in [step, log10(norm)], so interpolation follows the log axis.
type LPt = [step: number, log: number]
const LOG: LPt[] = GRAD.map(([s, v]) => [s, Math.log10(v)])
const LOG_MIN = Math.log10(NORM_MIN), LOG_MAX = Math.log10(NORM_MAX)
const LOW = Math.log10(CLIP_LOW), HIGH = Math.log10(CLIP_HIGH)
const BOTTOM = LOG.reduce((m, p, i) => (p[1] < LOG[m][1] ? i : m), 0) // where the early spike bottoms out
const SPIKE = LOG.slice(0, BOTTOM + 1), REST = LOG.slice(BOTTOM)

/** The pieces of a polyline above `level`, cut exactly where they cross it: the steps a threshold would clip. */
const above = (pts: LPt[], level: number): LPt[][] => {
  const runs: LPt[][] = []
  let run: LPt[] | null = null
  for (let i = 0; i < pts.length; i++) {
    const [s, l] = pts[i]
    if (i > 0) {
      const [s0, l0] = pts[i - 1]
      if ((l0 > level) !== (l > level)) {
        const at: LPt = [lerp(s0, s, (level - l0) / (l - l0)), level]
        if (run) { run.push(at); run = null } else { run = [at]; runs.push(run) }
      }
    }
    if (l > level) {
      if (!run) { run = []; runs.push(run) }
      run.push([s, l])
    }
  }
  return runs
}
const CLIPPED_HIGH = above(LOG, HIGH), CLIPPED_LOW = above(LOG, LOW)

/** The first `frac` (0..1) of a polyline, ending part-way along a segment so drawing is continuous. */
const partial = (pts: LPt[], frac: number): LPt[] => {
  const f = clamp(frac) * (pts.length - 1), i = Math.floor(f), k = f - i
  const out = pts.slice(0, i + 1)
  if (i < pts.length - 1) out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)])
  return out
}
/** The part of a polyline up to step `s`, for left-to-right reveals. */
const upTo = (pts: LPt[], s: number): LPt[] => {
  const out: LPt[] = []
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][0] <= s) { out.push(pts[i]); continue }
    if (i > 0) { const [s0, l0] = pts[i - 1], [s1, l1] = pts[i]; out.push([s, lerp(l0, l1, (s - s0) / (s1 - s0))]) }
    break
  }
  return out
}

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['An early gradient spike', 'unstable resnet-200 · grad L2 norm, log scale', 'The gradient norm starts near 2×10⁵, collapses within ~1k steps, then settles around 3.'],
  ['Clip just above typical', 'better clip threshold ≈ 4', 'A threshold just above the typical norm clips only the early spike and stabilizes training.'],
  ['Too aggressive: a hidden LR cut', 'clip threshold too aggressive ≈ 1', 'Clipping every step is in effect a lower learning rate, and it can slow down training.'],
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
  const project = getProject('AtoZAI · Gradient Clipping', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  // label offsets from the data point each label belongs to
  const nudge = (dx: number, dy: number) => t.compound({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(170, 170), width: t.number(1010, { range: [300, 1100] }), height: t.number(410, { range: [150, 470] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    formula: t.compound(pos(700, 270)),
    spikeLabel: nudge(14, 8),
    typicalLabel: nudge(0, 22),
    clippedLabel: nudge(18, 0),
    betterLabel: nudge(-4, -10),
    aggrLabel: nudge(-4, 19),
    everyLabel: nudge(0, 19),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: too aggressive
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: better threshold
    curve: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 0.9 }), // the measured grad norm
    lineWidth: t.number(2, { range: [1, 6] }),
    clipWidth: t.number(3, { range: [1, 8] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), spikeDraw: progress(), restDraw: progress(), normNotes: progress(),
    betterLine: progress(), betterClip: progress(), formula: progress(), dimBetter: progress(),
    aggrLine: progress(), aggrClip: progress(), aggrNote: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const GRID = { stroke: '#2e2e2b', 'stroke-width': 1 }, AXIS = { stroke: '#3a3a37', 'stroke-width': 1.5 }
  const TICK = { ...LABEL, 'font-size': 12 }, NOTE = { ...LABEL, 'font-size': 13 }
  const text = (s: string, attrs: Record<string, string | number>, parent: Element) => {
    const e = el('text', attrs, parent)
    e.textContent = s
    return e
  }

  const gPlot = el('g')
  const gFrame = el('g', {}, gPlot)
  const gridY = NORM_TICKS.map(() => el('line', GRID, gFrame))
  const gridX = STEP_TICKS.map(() => el('line', GRID, gFrame))
  const axX = el('line', AXIS, gFrame), axY = el('line', AXIS, gFrame)
  const tickX = STEP_TICKS.map((s) => text(String(s), { ...TICK, 'text-anchor': 'middle' }, gFrame))
  const tickY = NORM_TICKS.map(([, s]) => text(s, { ...TICK, 'font-size': 14, 'text-anchor': 'end' }, gFrame)) // superscripts read small
  const labX = text('GLOBAL STEP', { ...TICK, 'text-anchor': 'middle' }, gFrame)
  const labY = text('GRAD L2 NORM', { ...TICK, 'text-anchor': 'middle' }, gFrame)

  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const spikePath = el('path', curve, gPlot), restPath = el('path', curve, gPlot)
  const highClip = el('path', curve, gPlot), lowClip = el('path', curve, gPlot) // the clipped stretches, recoloured
  const highLine = el('line', { 'stroke-width': 2 }, gPlot), lowLine = el('line', { 'stroke-width': 2 }, gPlot)
  const spikeText = text('≈ 2×10⁵ AT STEP 0', NOTE, gPlot)
  const typicalText = text('TYPICAL NORM ≈ 3', { ...NOTE, 'text-anchor': 'middle' }, gPlot)
  const clippedText = text('CLIPPED: ONLY THE EARLY SPIKE', NOTE, gPlot)
  const betterText = text('BETTER CLIP THRESHOLD ≈ 4', { ...NOTE, 'text-anchor': 'end' }, gPlot)
  const aggrText = text('CLIP THRESHOLD TOO AGGRESSIVE ≈ 1', { ...NOTE, 'text-anchor': 'end' }, gPlot)
  const everyText = text('CLIPS ALMOST EVERY STEP: LIKE A LOWER LR', NOTE, gPlot)
  const gFormula = el('g')
  text('if ‖g‖ > λ:  g′ = λ · g / ‖g‖', { fill: '#ededea', 'font-size': 20, 'font-family': 'JetBrains Mono Variable, monospace' }, gFormula)
  text('λ = clip threshold', { y: 30, fill: '#8d8c86', 'font-size': 16, 'font-family': 'JetBrains Mono Variable, monospace' }, gFormula)

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const before = rgba(S.before), after = rgba(S.after)
    const { x: px, y: py, width: w, height: h } = L.plot, pb = py + h
    const X = (s: number) => px + ((s - STEP_MIN) / (STEP_MAX - STEP_MIN)) * w
    const Y = (l: number) => py + ((LOG_MAX - l) / (LOG_MAX - LOG_MIN)) * h
    const d = (pts: LPt[]) => pts.map(([s, l], j) => `${j ? 'L' : 'M'}${X(s).toFixed(1)} ${Y(l).toFixed(1)}`).join(' ')
    const lbl = (e: Element, x: number, y: number, n: { dx: number; dy: number }, opacity: number, fill?: string) =>
      set(e, { x: x + n.dx, y: y + n.dy, opacity, ...(fill ? { fill } : {}) })

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // axes: the original's ranges and ticks, log y
    set(gFrame, { opacity: T.axesIn })
    set(axX, { x1: px, y1: pb, x2: px + w, y2: pb })
    set(axY, { x1: px, y1: pb, x2: px, y2: py })
    NORM_TICKS.forEach(([l], i) => {
      set(gridY[i], { x1: px, y1: Y(l), x2: px + w, y2: Y(l) })
      set(tickY[i], { x: px - 10, y: Y(l) + 4 })
    })
    STEP_TICKS.forEach((s, i) => {
      set(gridX[i], { x1: X(s), y1: pb, x2: X(s), y2: py })
      set(tickX[i], { x: X(s), y: pb + 24 })
    })
    set(labX, { x: px + w / 2, y: pb + 50 })
    set(labY, { transform: `translate(${px - 52},${py + h / 2}) rotate(-90)` })

    // slide 1: the measured grad norm, spike first, then the long settled stretch
    const stroke = rgba(S.curve)
    set(spikePath, { d: d(partial(SPIKE, T.spikeDraw)), stroke, 'stroke-width': S.lineWidth, opacity: T.spikeDraw > 0 ? 1 : 0 })
    set(restPath, { d: d(partial(REST, T.restDraw)), stroke, 'stroke-width': S.lineWidth, opacity: T.restDraw > 0 ? 1 : 0 })
    lbl(spikeText, X(LOG[0][0]), Y(LOG[0][1]), L.spikeLabel, T.normNotes)
    lbl(typicalText, X(60000), Y(Math.log10(3)), L.typicalLabel, T.normNotes)

    // slide 2: the better threshold sits just above the typical norm, so it clips only the spike
    const dim = 1 - 0.6 * T.dimBetter
    set(highLine, { x1: px, y1: Y(HIGH), x2: px + w * T.betterLine, y2: Y(HIGH), stroke: after, opacity: (T.betterLine > 0 ? 1 : 0) * dim })
    set(highClip, { d: CLIPPED_HIGH.map(d).join(' '), stroke: after, 'stroke-width': S.clipWidth, opacity: T.betterClip * dim })
    lbl(betterText, px + w, Y(HIGH), L.betterLabel, T.betterLine * dim, after)
    lbl(clippedText, X(0), Y(2.5), L.clippedLabel, T.betterClip * dim, after)
    set(gFormula, { transform: `translate(${L.formula.x},${L.formula.y})`, opacity: T.formula })

    // slide 3: the aggressive threshold sits below the typical norm, so nearly every step gets clipped
    const sweep = lerp(STEP_MIN, STEP_MAX, T.aggrClip)
    set(lowLine, { x1: px, y1: Y(LOW), x2: px + w * T.aggrLine, y2: Y(LOW), stroke: before, opacity: T.aggrLine > 0 ? 1 : 0 })
    set(lowClip, { d: CLIPPED_LOW.map((run) => d(upTo(run, sweep))).join(' '), stroke: before, 'stroke-width': S.clipWidth, opacity: T.aggrClip > 0 ? 1 : 0 })
    lbl(aggrText, px + w, Y(LOW), L.aggrLabel, T.aggrLine, before)
    lbl(everyText, X(20000), Y(LOW), L.everyLabel, T.aggrNote, before)
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Gradient clipping'
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

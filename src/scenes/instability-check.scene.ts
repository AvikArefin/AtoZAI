// Instability check explainer: best LR sits at the edge of the infeasible region → re-run above it → loss jumps = instability.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/instability-check/), export the JSON to src/scenes/instability-check.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./instability-check.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once instability-check.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    dotsIn: [[1.2, 0], [2.8, 1]],
    bestIn: [[3, 0], [3.8, 1]],
    failIn: [[4.2, 0], [5.2, 1]],
    edge: [[5.8, 0], [7.2, 1]],
    split: [[9, 0, 'ease'], [10.8, 1]],
    probe: [[11, 0], [12, 1]],
    lossAxes: [[10.8, 0], [11.8, 1]],
    declineDraw: [[12, 0], [15.5, 1]],
    declineNote: [[15.5, 0], [16.5, 1], [22.5, 1], [23.5, 0]],
    riseDraw: [[18.8, 0], [22.5, 1]],
    jumpNote: [[23, 0], [24.2, 1]],
    verdict: [[25, 0], [26.2, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: real results, traced once ----------
// Traced from google-research/tuning_playbook assets/axis_model_with_instability.png (CC BY 4.0).
// Figure 7a: [base learning rate, cross-entropy loss on the validation set], one point per trial.
// Infeasible trials (NaNs or uncharacteristically high loss) sit at 1.8 in the original: a placeholder, not a measurement.
type Trial = [lr: number, loss: number]
const FEASIBLE: Trial[] = [[3.17e-4, 1.593], [6.02e-4, 1.536], [1.14e-3, 1.497], [2.16e-3, 1.479], [7.77e-3, 1.485]]
const BEST: Trial = [4.09e-3, 1.472]
const INFEASIBLE: Trial[] = [[1.47e-2, 1.8], [2.78e-2, 1.8], [5.28e-2, 1.8], [9.97e-2, 1.8]]
const LR_MIN = 2.37e-4, LR_MAX = 0.134, VAL_MIN = 1.4, VAL_MAX = 1.9 // the original's axis ranges (x is log)
const LR_TICKS: [number, string][] = [[1e-3, '10⁻³'], [1e-2, '10⁻²'], [1e-1, '10⁻¹']]
const LR_MINOR = [1e-4, 1e-3, 1e-2].flatMap((d) => [2, 3, 4, 5, 6, 7, 8, 9].map((m) => m * d)).filter((v) => v > LR_MIN && v < LR_MAX)
const VAL_TICKS = [1.4, 1.5, 1.6, 1.7, 1.8, 1.9]
// Where the shaded infeasible region starts: halfway (on the log axis) between the largest feasible and smallest infeasible LR.
const EDGE_LR = Math.sqrt(Math.max(BEST[0], ...FEASIBLE.map((p) => p[0])) * Math.min(...INFEASIBLE.map((p) => p[0])))
const PROBE = [5 * BEST[0], 10 * BEST[0]] // the doc's double-check: retrain at 5–10× the best learning rate

// Traced from google-research/tuning_playbook assets/loss_model_with_instability.png (CC BY 4.0).
// Figure 7b: [global step, cross-entropy loss on the training set] of one unstable run (eval points, simplified).
type Pt = [step: number, loss: number]
const LOSS: Pt[] = [
  [0, 10.4], [152, 6.23], [349, 5.4], [746, 4.53], [1493, 3.59], [2241, 3.03],
  [2716, 2.84], [3257, 2.68], [3788, 2.6], [4803, 2.47], [5260, 2.32], [5463, 2.32],
  [5866, 2.35], [9316, 2.28], [9905, 2.28], [10288, 2.3], [11355, 4.01], [11554, 4.04],
  [12471, 4.1], [13672, 4.03], [13821, 4.04], [13942, 4.1], [14151, 4.12], [14965, 4.12],
  [15159, 4.11], [15932, 3.96], [16122, 3.96], [16526, 3.99], [16729, 3.99], [18253, 3.75],
  [18477, 3.73], [20069, 3.68], [22043, 3.73], [22336, 3.73], [23916, 3.7], [24324, 3.64],
  [24514, 3.63], [26677, 3.61], [27960, 3.63], [30029, 3.65], [32000, 3.62], [33977, 3.61],
  [35851, 3.58], [38018, 3.65], [39396, 3.59], [42256, 3.56], [43146, 3.55], [44029, 3.56],
  [46008, 3.48], [47584, 3.5], [50049, 3.46], [51923, 3.43], [52515, 3.44], [53990, 3.42],
  [55966, 3.39], [58036, 3.41], [61979, 3.34], [63955, 3.35], [66026, 3.32], [68095, 3.35],
  [69571, 3.32], [70063, 3.32], [71941, 3.27], [74016, 3.28], [75986, 3.23], [77663, 3.25],
  [79931, 3.26], [82101, 3.23], [83974, 3.24], [93146, 3.21], [100000, 3.21],
]
const STEP_MIN = -5030, STEP_MAX = 105030, LOSS_MIN = 1.869, LOSS_MAX = 10.787 // the original's axis ranges
const STEP_TICKS = [0, 20000, 40000, 60000, 80000, 100000]
const LOSS_TICKS = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const JUMP = LOSS.findIndex(([s]) => s > 10000) // last eval before the sudden rise (step ≈ 10.3k)
const DECLINE = LOSS.slice(0, JUMP + 1), RISE = LOSS.slice(JUMP)
const PRE_JUMP = DECLINE.reduce((m, p) => (p[1] < m[1] ? p : m)) // lowest loss before the jump
const FINAL = LOSS[LOSS.length - 1]

/** The first `frac` (0..1) of a polyline, ending part-way along a segment so drawing is continuous. */
const partial = (pts: Pt[], frac: number): Pt[] => {
  const f = clamp(frac) * (pts.length - 1), i = Math.floor(f), k = f - i
  const out = pts.slice(0, i + 1)
  if (i < pts.length - 1) out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)])
  return out
}
/** Five-pointed star path (matplotlib's '*' marker) centred on (x, y) with outer radius r. */
const star = (x: number, y: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const q = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + (i * Math.PI) / 5
    return `${i ? 'L' : 'M'}${(x + q * Math.cos(a)).toFixed(1)} ${(y + q * Math.sin(a)).toFixed(1)}`
  }).join(' ') + 'Z'
const cross = (x: number, y: number, r: number) => `M${x - r} ${y - r}L${x + r} ${y + r}M${x - r} ${y + r}L${x + r} ${y - r}`

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['The best LR sits on the edge', 'axis plot · infeasible = NaN or blown-up loss', 'The best learning rate sits right at the edge of the infeasible region: suspect instability.'],
  ['Double-check with a loss curve', 'training loss of an unstable model', 'To double-check, train at 5–10× the best learning rate and watch the training loss.'],
  ['A sudden rise means instability', 'loss jumps near step 10k and never recovers', 'A steady decline, then a sudden rise that never recovers: optimization instability.'],
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
  const project = getProject('AtoZAI · Instability Check', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const rect = (x: number, y: number, w: number, h: number) =>
    t.compound({ ...pos(x, y), width: t.number(w, { range: [200, 1100] }), height: t.number(h, { range: [150, 470] }) })
  // label offsets from the data point each label belongs to
  const nudge = (dx: number, dy: number) => t.compound({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    axisPlot: rect(170, 180, 960, 360), // slide 1: the axis plot alone
    axisPlotSplit: rect(150, 200, 430, 340), // slides 2–3: shrunk to the left half
    lossPlot: rect(770, 200, 430, 340),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    feasibleLabel: nudge(16, -14),
    bestLabel: nudge(0, 34),
    failLabel: nudge(-8, 32),
    edgeLabel: nudge(-10, 18),
    probeLabel: nudge(0, -28),
    declineLabel: nudge(14, 4),
    jumpLabel: nudge(8, -24),
    preJumpLabel: nudge(-4, -8),
    finalLabel: nudge(0, -14),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: infeasible / unstable
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: feasible / stable
    pointRadius: t.number(7, { range: [1, 14] }),
    starSize: t.number(13, { range: [4, 30] }),
    crossSize: t.number(6, { range: [2, 14] }),
    lineWidth: t.number(2.5, { range: [1, 6] }),
    bandOpacity: t.number(0.12, { range: [0, 0.5] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), dotsIn: progress(), bestIn: progress(), failIn: progress(), edge: progress(),
    split: progress(), probe: progress(), lossAxes: progress(), declineDraw: progress(), declineNote: progress(0),
    riseDraw: progress(), jumpNote: progress(), verdict: progress(),
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

  // Figure 7a: hyperparameter axis plot
  const gAxis = el('g')
  const band = el('rect', {}, gAxis)
  const edgeLine = el('line', { 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, gAxis)
  const gAxisFrame = el('g', {}, gAxis)
  const aGridY = VAL_TICKS.slice(1).map(() => el('line', GRID, gAxisFrame))
  const aGridX = LR_TICKS.map(() => el('line', GRID, gAxisFrame))
  const aAxX = el('line', AXIS, gAxisFrame), aAxY = el('line', AXIS, gAxisFrame)
  const aMajor = LR_TICKS.map(() => el('line', AXIS, gAxisFrame))
  const aMinor = LR_MINOR.map(() => el('line', { ...AXIS, 'stroke-width': 1 }, gAxisFrame))
  const aTickX = LR_TICKS.map(([, s]) => text(s, { ...TICK, 'font-size': 14, 'text-anchor': 'middle' }, gAxisFrame)) // superscripts read small
  const aTickY = VAL_TICKS.map((v) => text(v.toFixed(1), { ...TICK, 'text-anchor': 'end' }, gAxisFrame))
  const aLabX = text('BASE LEARNING RATE', { ...TICK, 'text-anchor': 'middle' }, gAxisFrame)
  const aLabY = text('CROSS-ENTROPY LOSS ON THE VALIDATION SET', { ...TICK, 'text-anchor': 'middle' }, gAxisFrame)
  const dots = FEASIBLE.map(() => el('circle', {}, gAxis))
  const bestMark = el('path', { fill: '#ededea' }, gAxis)
  const fails = INFEASIBLE.map(() => el('path', { fill: 'none', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, gAxis))
  const feasibleText = text('FEASIBLE TRIALS', NOTE, gAxis)
  const bestText = text('BEST TRIAL', { ...NOTE, fill: '#ededea', 'text-anchor': 'middle' }, gAxis)
  const failText = text('INFEASIBLE TRIALS', NOTE, gAxis)
  const edgeText = text('EDGE OF FEASIBILITY', { ...NOTE, 'text-anchor': 'end' }, gAxis)
  const gProbe = el('g', { stroke: '#ededea', 'stroke-width': 1.5 }, gAxis)
  const probeLine = el('line', {}, gProbe), probeTickA = el('line', {}, gProbe), probeTickB = el('line', {}, gProbe)
  const probeText = text('5–10× BEST LR', { ...NOTE, fill: '#ededea', 'text-anchor': 'middle' }, gAxis)

  // Figure 7b: training loss of the unstable run
  const gLoss = el('g')
  const gLossFrame = el('g', {}, gLoss)
  const lGridY = LOSS_TICKS.map(() => el('line', GRID, gLossFrame))
  const lGridX = STEP_TICKS.map(() => el('line', GRID, gLossFrame))
  const lAxX = el('line', AXIS, gLossFrame), lAxY = el('line', AXIS, gLossFrame)
  const lTickX = STEP_TICKS.map((s) => text(String(s), { ...TICK, 'text-anchor': 'middle' }, gLossFrame))
  const lTickY = LOSS_TICKS.map((v) => text(String(v), { ...TICK, 'text-anchor': 'end' }, gLossFrame))
  const lLabX = text('GLOBAL STEP', { ...TICK, 'text-anchor': 'middle' }, gLossFrame)
  const lLabY = text('CROSS-ENTROPY LOSS ON THE TRAINING SET', { ...TICK, 'text-anchor': 'middle' }, gLossFrame)
  const preLine = el('line', { stroke: '#8d8c86', 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, gLoss)
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const declinePath = el('path', curve, gLoss), risePath = el('path', curve, gLoss)
  const declineText = text('STEADY DECLINE', NOTE, gLoss)
  const jumpText = text('SUDDEN RISE AT STEP ≈ 10K', NOTE, gLoss)
  const preText = text(`BEFORE THE JUMP: ${PRE_JUMP[1].toFixed(2)}`, { ...NOTE, 'text-anchor': 'end' }, gLoss)
  const finalText = text(`STILL ${FINAL[1].toFixed(2)} AT STEP 100K`, { ...NOTE, 'text-anchor': 'end' }, gLoss)

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
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

    // --- axis plot: full width on slide 1, then `split` slides it into the left half
    const F = L.axisPlot, G = L.axisPlotSplit, k = T.split
    const ax = lerp(F.x, G.x, k), ay = lerp(F.y, G.y, k), aw = lerp(F.width, G.width, k), ah = lerp(F.height, G.height, k)
    const AX = (lr: number) => ax + ((Math.log10(lr) - Math.log10(LR_MIN)) / (Math.log10(LR_MAX) - Math.log10(LR_MIN))) * aw
    const AY = (v: number) => ay + ((VAL_MAX - v) / (VAL_MAX - VAL_MIN)) * ah
    const ab = ay + ah

    set(gAxisFrame, { opacity: T.axesIn })
    set(aAxX, { x1: ax, y1: ab, x2: ax + aw, y2: ab })
    set(aAxY, { x1: ax, y1: ab, x2: ax, y2: ay })
    VAL_TICKS.slice(1).forEach((v, i) => set(aGridY[i], { x1: ax, y1: AY(v), x2: ax + aw, y2: AY(v) }))
    VAL_TICKS.forEach((v, i) => set(aTickY[i], { x: ax - 10, y: AY(v) + 4 }))
    LR_TICKS.forEach(([lr], i) => {
      const x = AX(lr)
      set(aGridX[i], { x1: x, y1: ab, x2: x, y2: ay })
      set(aMajor[i], { x1: x, y1: ab, x2: x, y2: ab + 7 })
      set(aTickX[i], { x, y: ab + 24 })
    })
    LR_MINOR.forEach((lr, i) => set(aMinor[i], { x1: AX(lr), y1: ab, x2: AX(lr), y2: ab + 4 }))
    set(aLabX, { x: ax + aw / 2, y: ab + 50 })
    set(aLabY, { transform: `translate(${ax - 48},${ay + ah / 2}) rotate(-90)` })

    // trials: feasible dots grow in, then the best trial, then the infeasible ones
    FEASIBLE.forEach(([lr, v], i) => set(dots[i], { cx: AX(lr), cy: AY(v), r: S.pointRadius * T.dotsIn, fill: after }))
    set(bestMark, { d: star(AX(BEST[0]), AY(BEST[1]), Math.max(0.01, S.starSize * T.bestIn)) })
    INFEASIBLE.forEach(([lr, v], i) => set(fails[i], { d: cross(AX(lr), AY(v), S.crossSize), stroke: before, opacity: T.failIn }))
    const lbl = (e: Element, x: number, y: number, n: { dx: number; dy: number }, opacity: number, fill?: string) =>
      set(e, { x: x + n.dx, y: y + n.dy, opacity, ...(fill ? { fill } : {}) })
    lbl(feasibleText, AX(FEASIBLE[0][0]), AY(FEASIBLE[0][1]), L.feasibleLabel, T.dotsIn, after)
    lbl(bestText, AX(BEST[0]), AY(BEST[1]), L.bestLabel, T.bestIn)
    lbl(failText, AX(INFEASIBLE[0][0]), AY(INFEASIBLE[0][1]), L.failLabel, T.failIn, before)

    // the infeasible region starts right after the best trials
    const xe = AX(EDGE_LR)
    set(band, { x: xe, y: ay, width: Math.max(0, ax + aw - xe), height: ah, fill: before, opacity: S.bandOpacity * T.edge })
    set(edgeLine, { x1: xe, y1: ab, x2: xe, y2: ay, stroke: before, opacity: T.edge })
    lbl(edgeText, xe, ay, L.edgeLabel, T.edge, before)

    // slide 2: the double-check learning rates, 5–10× the best
    const p0 = AX(PROBE[0]), p1 = AX(PROBE[1]), py = AY(INFEASIBLE[0][1]) + L.probeLabel.dy
    set(gProbe, { opacity: T.probe })
    set(probeLine, { x1: p0, y1: py, x2: p1, y2: py })
    set(probeTickA, { x1: p0, y1: py, x2: p0, y2: py + 6 })
    set(probeTickB, { x1: p1, y1: py, x2: p1, y2: py + 6 })
    set(probeText, { x: (p0 + p1) / 2 + L.probeLabel.dx, y: py - 8, opacity: T.probe })

    // --- loss plot (right half), from slide 2
    const P = L.lossPlot, lb = P.y + P.height
    const LX = (s: number) => P.x + ((s - STEP_MIN) / (STEP_MAX - STEP_MIN)) * P.width
    const LY = (v: number) => P.y + ((LOSS_MAX - v) / (LOSS_MAX - LOSS_MIN)) * P.height
    const d = (pts: Pt[]) => pts.map(([s, v], j) => `${j ? 'L' : 'M'}${LX(s).toFixed(1)} ${LY(v).toFixed(1)}`).join(' ')
    set(gLossFrame, { opacity: T.lossAxes })
    set(lAxX, { x1: P.x, y1: lb, x2: P.x + P.width, y2: lb })
    set(lAxY, { x1: P.x, y1: lb, x2: P.x, y2: P.y })
    LOSS_TICKS.forEach((v, i) => {
      set(lGridY[i], { x1: P.x, y1: LY(v), x2: P.x + P.width, y2: LY(v) })
      set(lTickY[i], { x: P.x - 10, y: LY(v) + 4 })
    })
    STEP_TICKS.forEach((s, i) => {
      set(lGridX[i], { x1: LX(s), y1: lb, x2: LX(s), y2: P.y })
      set(lTickX[i], { x: LX(s), y: lb + 24 })
    })
    set(lLabX, { x: P.x + P.width / 2, y: lb + 50 })
    set(lLabY, { transform: `translate(${P.x - 48},${P.y + P.height / 2}) rotate(-90)` })

    // the run: a steady decline (cobalt), then the sudden rise and everything after it (orange)
    set(declinePath, { d: d(partial(DECLINE, T.declineDraw)), stroke: after, 'stroke-width': S.lineWidth, opacity: T.declineDraw > 0 ? 1 : 0 })
    set(risePath, { d: d(partial(RISE, T.riseDraw)), stroke: before, 'stroke-width': S.lineWidth, opacity: T.riseDraw > 0 ? 1 : 0 })
    const last = DECLINE[DECLINE.length - 1], peak = RISE[1]
    lbl(declineText, LX(last[0]), LY(last[1]), L.declineLabel, T.declineNote, after)
    lbl(jumpText, LX(peak[0]), LY(peak[1]), L.jumpLabel, T.jumpNote, before)

    // slide 3: the loss never gets back to where it was before the jump
    const yPre = LY(PRE_JUMP[1])
    set(preLine, { x1: LX(PRE_JUMP[0]), y1: yPre, x2: P.x + P.width, y2: yPre, opacity: T.jumpNote })
    lbl(preText, P.x + P.width, yPre, L.preJumpLabel, T.jumpNote)
    lbl(finalText, LX(FINAL[0]), LY(FINAL[1]), L.finalLabel, T.verdict, before)
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Instability check'
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

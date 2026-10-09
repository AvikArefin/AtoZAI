// Hockey-stick loss explainer: bad init plunges then flattens → the plunge only reaches a constant guess → good init starts there.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/hockey-stick/), export the JSON to src/scenes/hockey-stick.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./hockey-stick.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once hockey-stick.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    badDraw: [[1.2, 0], [6.5, 1]],
    baseline: [[9.5, 0], [10.7, 1]],
    wasted: [[11, 0], [12.5, 1], [18, 1], [19, 0]],
    dimBad: [[18.5, 0], [19.5, 1]],
    goodDraw: [[19.5, 0], [24.5, 1]],
    lag: [[25, 0], [26.5, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
// Loss against training step. Good init starts at the best constant guess (ln 10 ≈ 2.3 for 10 balanced
// classes) and decays towards a floor. Bad init starts far higher, plunges in ~BLADE steps (the blade),
// and from then on runs DELAY steps behind the good run.
const STEPS = 1500, Y_MAX = 7
const BASE = 2.3, FLOOR = 0.25, HIGH = 6.5, TAU = 600, BLADE = 40, DELAY = 200
const slow = (s: number) => FLOOR + (BASE - FLOOR) * Math.exp(-s / TAU)
const bad = (s: number) => slow(s - DELAY * (1 - Math.exp(-s / DELAY))) + (HIGH - BASE) * Math.exp(-s / BLADE)
type Pt = [step: number, loss: number]
const sample = (f: (s: number) => number): Pt[] =>
  Array.from({ length: 601 }, (_, i) => { const s = (i / 600) * STEPS; return [s, f(s)] })
const badPts = sample(bad), goodPts = sample(slow)
const WASTED = badPts.find(([, l]) => l <= BASE)?.[0] ?? 0 // steps the blade takes to fall to the baseline

/** The first `frac` (0..1) of a polyline, ending part-way along a segment so drawing is continuous. */
const partial = (pts: Pt[], frac: number): Pt[] => {
  const f = clamp(frac) * (pts.length - 1), i = Math.floor(f), k = f - i
  const out = pts.slice(0, i + 1)
  if (i < pts.length - 1) out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)])
  return out
}
/** First step at which a decreasing curve gets down to `level`. */
const stepAt = (pts: Pt[], level: number) => {
  for (let i = 1; i < pts.length; i++) {
    const [s0, l0] = pts[i - 1], [s1, l1] = pts[i]
    if (l1 <= level) return lerp(s0, s1, (l0 - level) / (l0 - l1))
  }
  return STEPS
}

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['The hockey stick', 'bad init · offset output or overconfident logits', 'The loss starts far above a constant guess, plunges, then flattens out.'],
  ['The blade is not learning', 'the first steps only fix the starting point', 'The plunge only reaches the loss a constant guess gets for free; no input has been learned yet.'],
  ['Initialise well', 'small final weights · bias = best constant guess', 'Start on the baseline and every step learns from the inputs; bad init gets there later.'],
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
  const project = getProject('AtoZAI · Hockey Stick', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(160, 180), width: t.number(1000, { range: [300, 1100] }), height: t.number(400, { range: [150, 470] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    badLabel: t.compound(pos(178, 214)),
    goodLabel: t.compound(pos(178, 500)),
    wastedLabel: t.compound(pos(272, 330)),
    lagLoss: t.number(1, { range: [0.6, 2] }), // loss level at which the bracket measures the lag
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt
    pointRadius: t.number(5, { range: [1, 14] }),
    lineWidth: t.number(2.5, { range: [1, 6] }),
    bandOpacity: t.number(0.14, { range: [0, 0.5] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), badDraw: progress(), baseline: progress(), wasted: progress(0),
    dimBad: progress(), goodDraw: progress(), lag: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const gPlot = el('g')
  const band = el('rect', {}, gPlot)
  const gAxes = el('g', {}, gPlot)
  const axX = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes), axY = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'TRAINING STEP →'; labY.textContent = 'LOSS'
  const baseLine = el('line', { stroke: '#8d8c86', 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, gPlot)
  const baseText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gPlot)
  baseText.textContent = 'BEST CONSTANT GUESS'
  const wastedText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  wastedText.textContent = '← WASTED STEPS'
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const badPath = el('path', curve, gPlot), goodPath = el('path', curve, gPlot)
  const badDot = el('circle', {}, gPlot), goodDot = el('circle', {}, gPlot)
  const badText = el('text', { ...LABEL, 'font-size': 13 }, gPlot), goodText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  badText.textContent = 'BAD INIT'; goodText.textContent = 'GOOD INIT'
  const gLag = el('g', { stroke: '#ededea', 'stroke-width': 1.5 }, gPlot)
  const lagLine = el('line', {}, gLag), lagTickA = el('line', {}, gLag), lagTickB = el('line', {}, gLag)
  const lagText = el('text', { ...LABEL, fill: '#ededea', 'font-size': 13 }, gPlot)

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot
    const X = (s: number) => px + (s / STEPS) * w
    const Y = (l: number) => py + h - (l / Y_MAX) * h
    const d = (pts: Pt[]) => pts.map(([s, l], j) => `${j ? 'L' : 'M'}${X(s).toFixed(1)} ${Y(l).toFixed(1)}`).join(' ')

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
    set(axX, { x1: px, y1: py + h, x2: px + w, y2: py + h })
    set(axY, { x1: px, y1: py + h, x2: px, y2: py })
    set(labX, { x: px + w / 2, y: py + h + 36 })
    set(labY, { transform: `translate(${px - 24},${py + h / 2}) rotate(-90)` })

    // slide 2: the constant-guess baseline, and the band of steps spent getting down to it
    const yBase = Y(BASE)
    set(baseLine, { x1: px, y1: yBase, x2: px + w, y2: yBase, opacity: T.baseline })
    set(baseText, { x: px + w, y: yBase - 10, opacity: T.baseline })
    set(band, { x: px, y: py, width: X(WASTED) - px, height: h, fill: rgba(S.before), opacity: S.bandOpacity * T.wasted })
    set(wastedText, { x: L.wastedLabel.x, y: L.wastedLabel.y, fill: rgba(S.before), opacity: T.wasted })

    // curves: bad init draws on slide 1 and dims on slide 3, where good init draws from the baseline
    const badAlpha = 1 - 0.65 * T.dimBad
    const badOn = T.badDraw > 0 ? badAlpha : 0, goodOn = T.goodDraw > 0 ? 1 : 0
    set(badPath, { d: d(partial(badPts, T.badDraw)), stroke: rgba(S.before), 'stroke-width': S.lineWidth, opacity: badAlpha })
    set(goodPath, { d: d(partial(goodPts, T.goodDraw)), stroke: rgba(S.after), 'stroke-width': S.lineWidth })
    set(badDot, { cx: X(0), cy: Y(HIGH), r: S.pointRadius, fill: rgba(S.before), opacity: badOn })
    set(goodDot, { cx: X(0), cy: Y(BASE), r: S.pointRadius, fill: rgba(S.after), opacity: goodOn })
    set(badText, { x: L.badLabel.x, y: L.badLabel.y, fill: rgba(S.before), opacity: badOn })
    set(goodText, { x: L.goodLabel.x, y: L.goodLabel.y, fill: rgba(S.after), opacity: goodOn })

    // slide 3: how many steps later bad init reaches the same loss
    const sGood = stepAt(goodPts, L.lagLoss), sBad = stepAt(badPts, L.lagLoss)
    const x0 = X(sGood), x1 = X(sBad), yl = Y(L.lagLoss)
    set(gLag, { opacity: T.lag })
    set(lagLine, { x1: x0, y1: yl, x2: x1, y2: yl })
    set(lagTickA, { x1: x0, y1: yl - 6, x2: x0, y2: yl + 6 })
    set(lagTickB, { x1: x1, y1: yl - 6, x2: x1, y2: yl + 6 })
    set(lagText, { x: x1 + 10, y: yl - 10, opacity: T.lag })
    lagText.textContent = `SAME LOSS, ≈ ${Math.round((sBad - sGood) / 10) * 10} STEPS LATER`
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Hockey-stick loss'
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

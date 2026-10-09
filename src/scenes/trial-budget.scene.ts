// Trial budget explainer: best-of-n box plots appear (n = 6…20) → 6 vs 20 trials compared by IQR →
// even 20 trials' spread is wider than seed-to-seed re-training noise (±0.1%).
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/trial-budget/), export the JSON to src/scenes/trial-budget.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./trial-budget.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once trial-budget.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [18, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [18, 0], [18.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    // one track per box so each grows out of its median in turn (n = 6 … 20)
    b6: [[1.4, 0], [2.2, 1]], b7: [[1.75, 0], [2.55, 1]], b8: [[2.1, 0], [2.9, 1]], b9: [[2.45, 0], [3.25, 1]],
    b10: [[2.8, 0], [3.6, 1]], b11: [[3.15, 0], [3.95, 1]], b12: [[3.5, 0], [4.3, 1]], b13: [[3.85, 0], [4.65, 1]],
    b14: [[4.2, 0], [5, 1]], b15: [[4.55, 0], [5.35, 1]], b16: [[4.9, 0], [5.7, 1]], b17: [[5.25, 0], [6.05, 1]],
    b18: [[5.6, 0], [6.4, 1]], b19: [[5.95, 0], [6.75, 1]], b20: [[6.3, 0], [7.1, 1]],
    dimOthers: [[9.5, 0], [10.5, 1]],
    hl6: [[10, 0], [11, 1]],
    iqr6: [[11, 0, 'ease'], [12.8, 1], [18, 1], [18.8, 0]],
    hl20: [[13.5, 0], [14.5, 1]],
    iqr20: [[14.5, 0, 'ease'], [15.5, 1], [18, 1], [18.8, 0]],
    dim6: [[18.5, 0], [19.5, 1]],
    seedBand: [[19.5, 0, 'ease'], [21.5, 1]],
    spread20: [[22.5, 0], [24, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`
const mix = (c: RGBA, d: RGBA, k: number): RGBA => ({ r: lerp(c.r, d.r, k), g: lerp(c.g, d.g, k), b: lerp(c.b, d.b, k), a: lerp(c.a, d.a, k) })

// ---------- 4. data: deterministic (seeded), computed once ----------
// Traced from google-research/tuning_playbook assets/validation_error_vs_num_trials.png (CC BY 4.0), which replaced
// the deleted have_we_sampled_enough.png. ResNet-50 on ImageNet, 100 trials; trial budgets simulated by bootstrapping.
// Per budget n: [n, whisker low, Q1, median, Q3, whisker high] of the best validation error rate.
// Kept to 4 decimals: neighbouring boxes differ by less than 0.001 (tracing accuracy ≈ ±0.0002).
type Box = [n: number, lo: number, q1: number, med: number, q3: number, hi: number]
const BOXES: Box[] = [
  [6, 0.2277, 0.2327, 0.2437, 0.2527, 0.2822],
  [7, 0.2277, 0.2321, 0.2367, 0.2517, 0.2802],
  [8, 0.2277, 0.2321, 0.2367, 0.2513, 0.2790],
  [9, 0.2277, 0.2321, 0.2364, 0.2472, 0.2692],
  [10, 0.2277, 0.2309, 0.2336, 0.2461, 0.2681],
  [11, 0.2277, 0.2309, 0.2334, 0.2446, 0.2648],
  [12, 0.2277, 0.2309, 0.2334, 0.2437, 0.2578],
  [13, 0.2277, 0.2309, 0.2334, 0.2437, 0.2578],
  [14, 0.2277, 0.2297, 0.2327, 0.2428, 0.2564],
  [15, 0.2277, 0.2297, 0.2327, 0.2428, 0.2578],
  [16, 0.2277, 0.2309, 0.2327, 0.2367, 0.2446],
  [17, 0.2277, 0.2297, 0.2321, 0.2364, 0.2462],
  [18, 0.2277, 0.2297, 0.2321, 0.2364, 0.2462],
  [19, 0.2277, 0.2297, 0.2321, 0.2364, 0.2462],
  [20, 0.2277, 0.2297, 0.2321, 0.2336, 0.2367],
]
const FIRST = BOXES[0], LAST = BOXES[BOXES.length - 1]
// Seed-to-seed re-training noise, as stated in the page text: about ±0.1% on a validation error rate of ~23%.
const SEED_MID = 0.23, SEED_HALF = 0.001
// Axis ranges and ticks of the original figure.
const X_MIN = 5.5, X_MAX = 20.5, Y_MIN = 0.225, Y_MAX = 0.2849
const X_TICKS = [6, 9, 12, 15, 18], Y_TICKS = [0.23, 0.24, 0.25, 0.26, 0.27, 0.28]
const pts = (v: number) => (v * 100).toFixed(1) // a gap in error rate, in percentage points

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['How many trials are enough?', 'ResNet-50 · ImageNet · 100 trials, bootstrapped', 'Each box: the best error of many bootstrapped studies of n trials, drawn from 100 real ones.'],
  ['6 trials vs 20 trials', 'interquartile range of the best error', 'With 6 trials the middle half of studies spans 2 points of error; with 20, about 0.4.'],
  ['Luck still beats seed noise', 're-training noise: about ±0.1% at ~23% error', 'Even at 20 trials, lucky and unlucky studies differ by more than re-training on a new seed.'],
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
  const project = getProject('AtoZAI · Trial Budget', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const offset = (dx: number, dy: number) => ({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(230, 170), width: t.number(800, { range: [300, 1100] }), height: t.number(420, { range: [150, 470] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    boxWidth: t.number(0.5, { range: [0.1, 0.9] }), // in trials, as in the original
    iqr6Label: t.compound(offset(16, -4)), // from the plot's right edge, at the middle of the 6-trial IQR
    iqr20Label: t.compound(offset(16, -4)), // from the plot's right edge, at the middle of the 20-trial IQR
    spreadLabel: t.compound(offset(16, 4)), // from the right edge, at the 20-trial whisker top
    seedLabel: t.compound(offset(16, 8)), // from the right edge, at the seed band's middle
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: 6 trials, wide
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: 20 trials, narrow
    box: t.rgba({ r: 0.553, g: 0.549, b: 0.525, a: 1 }), // every other box
    seed: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 1 }), // the re-training noise band
    lineWidth: t.number(2, { range: [1, 5] }),
    boxFill: t.number(0.14, { range: [0, 0.6] }),
    bandOpacity: t.number(0.1, { range: [0, 0.6] }),
    seedOpacity: t.number(0.3, { range: [0, 1] }),
    dimTo: t.number(0.25, { range: [0, 1] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(),
    b6: progress(), b7: progress(), b8: progress(), b9: progress(), b10: progress(), b11: progress(), b12: progress(), b13: progress(),
    b14: progress(), b15: progress(), b16: progress(), b17: progress(), b18: progress(), b19: progress(), b20: progress(),
    dimOthers: progress(), hl6: progress(), iqr6: progress(0), hl20: progress(), iqr20: progress(0),
    dim6: progress(), seedBand: progress(), spread20: progress(),
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
  const minor = BOXES.map(() => el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)) // a tick at every n
  const tickX = X_TICKS.map(v => { const n = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gAxes); n.textContent = String(v); return n })
  const tickY = Y_TICKS.map(v => { const n = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes); n.textContent = v.toFixed(2); return n })
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'NUMBER OF TRIALS'; labY.textContent = 'VALIDATION ERROR RATE'
  const seedBand = el('rect', {}, gPlot)
  const band6 = el('rect', {}, gPlot), band20 = el('rect', {}, gPlot)
  const boxes = BOXES.map(() => {
    const g = el('g', { fill: 'none', 'stroke-linecap': 'round' }, gPlot)
    return { g, rect: el('rect', {}, g), med: el('line', {}, g), up: el('line', {}, g), down: el('line', {}, g) }
  })
  const bracket = el('g', { 'stroke-width': 1.5 }, gPlot)
  const brLine = el('line', {}, bracket), brTop = el('line', {}, bracket), brBot = el('line', {}, bracket)
  const twoLines = (a: string, b: string) => {
    const txt = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
    const l1 = el('tspan', { x: 0, dy: 0 }, txt), l2 = el('tspan', { x: 0, dy: 17 }, txt)
    l1.textContent = a; l2.textContent = b
    return { txt, l1, l2 }
  }
  const lab6 = twoLines('6 TRIALS', `IQR ≈ ${pts(FIRST[4] - FIRST[2])} PTS`)
  const lab20 = twoLines('20 TRIALS', `IQR ≈ ${pts(LAST[4] - LAST[2])} PTS`)
  const labSpread = twoLines('20 TRIALS', `WHISKERS ≈ ${pts(LAST[5] - LAST[1])} PTS`)
  const labSeed = twoLines('RE-TRAIN SEEDS', `±${pts(SEED_HALF)} PTS`)

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot
    const X = (n: number) => px + ((n - X_MIN) / (X_MAX - X_MIN)) * w
    const Y = (v: number) => py + h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * h
    const bw = (L.boxWidth / (X_MAX - X_MIN)) * w, right = px + w

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
    set(axX, { x1: px, y1: py + h, x2: right, y2: py + h })
    set(axY, { x1: px, y1: py + h, x2: px, y2: py })
    BOXES.forEach(([n], i) => set(minor[i], { x1: X(n), y1: py + h, x2: X(n), y2: py + h + 6 }))
    X_TICKS.forEach((v, i) => {
      set(gridX[i], { x1: X(v), y1: py, x2: X(v), y2: py + h })
      set(tickX[i], { x: X(v), y: py + h + 24 })
    })
    Y_TICKS.forEach((v, i) => {
      set(gridY[i], { x1: px, y1: Y(v), x2: right, y2: Y(v) })
      set(tickY[i], { x: px - 10, y: Y(v) + 4 })
    })
    set(labX, { x: px + w / 2, y: py + h + 48 })
    set(labY, { transform: `translate(${px - 66},${py + h / 2}) rotate(-90)` })

    // slide 1: each box grows out of its median; slide 2: 6 → orange, 20 → cobalt, the rest dim
    const grow = [T.b6, T.b7, T.b8, T.b9, T.b10, T.b11, T.b12, T.b13, T.b14, T.b15, T.b16, T.b17, T.b18, T.b19, T.b20]
    BOXES.forEach(([n, lo, q1, med, q3, hi], i) => {
      const k = grow[i], b = boxes[i]
      const isFirst = i === 0, isLast = i === BOXES.length - 1
      const c = isFirst ? mix(S.box, S.before, T.hl6) : isLast ? mix(S.box, S.after, T.hl20) : S.box
      const alpha = isFirst ? lerp(1, S.dimTo, T.dim6) : isLast ? 1 : lerp(1, S.dimTo, T.dimOthers)
      const yQ3 = Y(lerp(med, q3, k)), yQ1 = Y(lerp(med, q1, k)), x = X(n)
      set(b.g, { stroke: rgba(c), 'stroke-width': S.lineWidth, opacity: k > 0 ? alpha : 0 })
      set(b.rect, { x: x - bw / 2, y: yQ3, width: bw, height: yQ1 - yQ3, fill: rgba(c), 'fill-opacity': S.boxFill })
      set(b.med, { x1: x - bw / 2, y1: Y(med), x2: x + bw / 2, y2: Y(med) })
      set(b.up, { x1: x, y1: yQ3, x2: x, y2: Y(lerp(med, hi, k)) })
      set(b.down, { x1: x, y1: yQ1, x2: x, y2: Y(lerp(med, lo, k)) })
    })

    // slide 2: each highlighted box's IQR stretches to the right edge as a band, labelled outside the plot
    const band = (r: Element, box: Box, c: RGBA, k: number) => {
      const x0 = X(box[0]) + bw / 2
      set(r, { x: x0, y: Y(box[4]), width: Math.max(0, (right - x0) * k), height: Y(box[2]) - Y(box[4]), fill: rgba(c), opacity: k > 0 ? S.bandOpacity : 0 })
    }
    band(band6, FIRST, S.before, T.iqr6)
    band(band20, LAST, S.after, T.iqr20)
    const place = (lab: { txt: Element; l1: Element; l2: Element }, x: number, y: number, fill: string, opacity: number) => {
      set(lab.txt, { transform: `translate(${x},${y})`, fill, opacity })
    }
    place(lab6, right + L.iqr6Label.dx, Y((FIRST[2] + FIRST[4]) / 2) + L.iqr6Label.dy, rgba(S.before), T.iqr6)
    place(lab20, right + L.iqr20Label.dx, Y((LAST[2] + LAST[4]) / 2) + L.iqr20Label.dy, rgba(S.after), T.iqr20)

    // slide 3: the ±0.1% seed band against the 20-trial whiskers
    const sTop = Y(SEED_MID + SEED_HALF), sBot = Y(SEED_MID - SEED_HALF)
    set(seedBand, { x: px, y: sTop, width: w * T.seedBand, height: sBot - sTop, fill: rgba(S.seed), opacity: T.seedBand > 0 ? S.seedOpacity : 0 })
    place(labSeed, right + L.seedLabel.dx, Y(SEED_MID) + L.seedLabel.dy, '#ededea', T.seedBand)
    const bx = X(LAST[0]) + bw / 2 + 10, yHi = Y(LAST[5]), yLo = Y(LAST[1])
    set(bracket, { stroke: rgba(S.after), opacity: T.spread20 })
    set(brLine, { x1: bx, y1: yHi, x2: bx, y2: yLo })
    set(brTop, { x1: bx - 5, y1: yHi, x2: bx, y2: yHi })
    set(brBot, { x1: bx - 5, y1: yLo, x2: bx, y2: yLo })
    place(labSpread, right + L.spreadLabel.dx, yHi + L.spreadLabel.dy, rgba(S.after), T.spread20)
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Trial budget'
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

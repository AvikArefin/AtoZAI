// Feature scaling explainer: unscaled data → min–max scaling → effect on the loss surface.
// Edit it in Studio at /AtoZAI/studio/feature-scaling/ (`npm run dev`), then export the project to
// src/scenes/feature-scaling.theatre.json to ship the edits.
//  - Layout / Style: positions, sizes and colours.
//  - Timeline: one keyframed track per thing that changes. render() maps each track value straight onto
//    the picture (no easing or staggering in code), so scrubbing moves things exactly as the curves in
//    Studio say. Easing is a keyframe choice, made and seen in Studio.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./feature-scaling.theatre.json', { eager: true, import: 'default' }),
)[0]

const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 30 // story length in seconds; the sequence plays at 1 unit = 1 s

// Starting keyframes: [seconds, value, curve to the next key ('linear' by default, 'ease', 'hold')].
// Once feature-scaling.theatre.json exists it replaces these, so retime in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [19, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [19, 0], [19.8, 1]],
    dotsIn: [[0.3, 0], [2.3, 1]],
    scale: [[9, 0], [11.5, 1]],
    formula: [[9.5, 0], [10.5, 1, 'hold'], [19, 0]],
    lossView: [[19, 0], [20.5, 1]],
    zigzag: [[20.5, 0], [24.5, 1]],
    round: [[25, 0], [26.5, 1]],
    straight: [[27, 0], [29, 1]],
  },
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`
const mix = (c: RGBA, d: RGBA, k: number): RGBA => ({ r: lerp(c.r, d.r, k), g: lerp(c.g, d.g, k), b: lerp(c.b, d.b, k), a: lerp(c.a, d.a, k) })

// Seeded data so every render is identical: income loosely grows with age.
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const data = Array.from({ length: 60 }, () => {
  const age = 10 + rnd() * 90
  return { age, inc: clamp(1000 + (age - 10) * 80 + (rnd() - 0.5) * 3500, 1000, 10000) }
})

// Gradient descent on L = ½(ax·x² + ay·y²), in unit coordinates centred on the minimum.
type Pt = [number, number]
const gd = (ax: number, ay: number, lr: number, n: number) => {
  let x = -0.9, y = 0.7
  const pts: Pt[] = [[x, y]]
  for (let i = 0; i < n; i++) { x -= lr * ax * x; y -= lr * ay * y; pts.push([x, y]) }
  return pts
}
const zigPts = gd(0.15, 3.6, 0.52, 26) // stretched bowl: zig-zags on the steep axis, crawls on the flat one
const strPts = gd(1, 1, 0.35, 26) // round bowl: walks straight to the minimum

/** The first `frac` (0..1) of a polyline, ending part-way along a segment so drawing is continuous. */
const partial = (pts: Pt[], frac: number): Pt[] => {
  const f = clamp(frac) * (pts.length - 1), i = Math.floor(f), k = f - i
  const out = pts.slice(0, i + 1)
  if (i < pts.length - 1) out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)])
  return out
}

const slides: [string, string, string][] = [
  ['Unscaled features', 'age ∈ [10, 100]  ·  income ∈ [1 000, 10 000]', 'On one shared axis, age collapses into a sliver.'],
  ['Min–max scaling', 'every feature mapped into [0, 1]', 'Same data, same shape — now both features speak at the same volume.'],
  ['Why it matters: the loss surface', 'gradient descent, unscaled vs scaled', 'Stretched contours make GD zig-zag. Round ones let it walk straight in.'],
]

export default function mount(host: HTMLElement, { autoplay }: SceneOptions) {
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

  // ---------- Theatre: layout and colours (props panel), timing (timeline) ----------
  const project = getProject('AtoZAI · Feature Scaling', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(640, 390), size: t.number(420, { range: [200, 640] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    formula: t.compound(pos(900, 260)),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }),
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }),
    pointRadius: t.number(5, { range: [1, 14] }),
  })
  // One prop per TRACKS entry. A default only shows if its track is deleted, so each is the final frame.
  const progress = (v: number) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(1), dotsIn: progress(1), scale: progress(1), formula: progress(0),
    lossView: progress(1), zigzag: progress(1), round: progress(1), straight: progress(1),
  })

  // ---------- scene graph: every element created once ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const gPlot = el('g'), gAxes = el('g', {}, gPlot), gPts = el('g', {}, gPlot)
  const gContour = el('g', {}, gPlot), gPath = el('g', {}, gPlot)
  const box = el('rect', { fill: 'none', 'stroke-dasharray': '3 5' }, gPlot)
  const axX = el('line', { stroke: '#3a3a37' }, gAxes), axY = el('line', { stroke: '#3a3a37' }, gAxes)
  const tickX = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes)
  const tickY = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes)
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'AGE'; labY.textContent = 'INCOME'
  const dots = data.map(() => el('circle', {}, gPts))
  const rings = [1, 2, 3, 4, 5].map(() => el('ellipse', { fill: 'none', stroke: '#2e2e2b', 'stroke-width': 1.5 }, gContour))
  const zig = el('path', { fill: 'none', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, gPath)
  const straight = el('path', { fill: 'none', 'stroke-width': 2.5 }, gPath)
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const formula = el('g')
  ;['x′ = (x − min) / (max − min)', 'age′ = (age − 10) / 90', 'income′ = (income − 1000) / 9000'].forEach((s, i) => {
    el('text', { y: i * 36, fill: i ? '#8d8c86' : '#ededea', 'font-size': i ? 18 : 22, 'font-family': 'JetBrains Mono Variable, monospace' }, formula).textContent = s
  })

  // ---------- render: a pure function of the Theatre values ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: cx, y: cy, size } = L.plot, half = size / 2

    // text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: T.text })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: T.text })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: T.text })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / 03 — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]
    set(formula, { transform: `translate(${L.formula.x},${L.formula.y})`, opacity: T.formula })

    // axes + scatter: one shared 0..10 000 axis → each feature in [0, 1]
    const scatter = 1 - T.lossView
    set(gAxes, { opacity: scatter }); set(gPts, { opacity: scatter })
    set(box, { x: cx - half, y: cy - half, width: size, height: size, stroke: rgba(S.after), opacity: T.scale * scatter })
    set(axX, { x1: cx - half, y1: cy + half, x2: cx + half, y2: cy + half })
    set(axY, { x1: cx - half, y1: cy + half, x2: cx - half, y2: cy - half })
    tickX.textContent = tickY.textContent = T.scale > 0.5 ? '1' : '10 000'
    set(tickX, { x: cx + half, y: cy + half + 20 }); set(tickY, { x: cx - half - 8, y: cy - half + 4 })
    set(labX, { x: cx, y: cy + half + 40 })
    set(labY, { transform: `translate(${cx - half - 44},${cy}) rotate(-90)` })
    const fill = rgba(mix(S.before, S.after, T.scale))
    data.forEach((d, i) => {
      const nx = lerp(d.age / 10000, (d.age - 10) / 90, T.scale)
      const ny = lerp(d.inc / 10000, (d.inc - 1000) / 9000, T.scale)
      set(dots[i], { cx: cx - half + nx * size, cy: cy + half - ny * size, r: S.pointRadius * T.dotsIn, fill })
    })

    // loss surface: round contours (the scaled bowl); the zig-zag path is the unscaled run
    set(gContour, { opacity: T.lossView }); set(gPath, { opacity: T.lossView })
    rings.forEach((e, i) => {
      const r = ((i + 1) / 5) * half
      set(e, { cx, cy, rx: r, ry: r })
    })
    const d = (pts: Pt[], sy: number) => pts.map(([x, y], j) => `${j ? 'L' : 'M'}${cx + x * half} ${cy - y * half * sy}`).join(' ')
    set(zig, { d: d(partial(zigPts, T.zigzag), 0.22), stroke: rgba(S.before), opacity: 1 - T.round * 0.7 })
    set(straight, { d: d(partial(strPts, T.straight), 1), stroke: rgba(S.after), opacity: T.round })
  }

  // ---------- control strip (below the screen, never over it) ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Feature scaling'
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

  // render on Theatre edits and whenever the playhead moves
  for (const o of [layout, style, timeline]) o.onValuesChange(render)
  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) sheet.sequence.pause() }).observe(host)
  const loop = () => { if (visible) { render(); tick() } requestAnimationFrame(loop) }
  project.ready.then(() => {
    render(); loop()
    if (!autoplay) return // edit page: Studio owns the playhead
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play()
    else sheet.sequence.position = end() // show the final frame
  })
  return project
}

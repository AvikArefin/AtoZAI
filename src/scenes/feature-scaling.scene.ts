// Feature scaling explainer: unscaled data → min–max scaling → effect on the loss surface.
// Everything spatial/visual is a Theatre.js prop, so it can be tuned in Studio (`npm run dev`)
// and exported as JSON to src/scenes/feature-scaling.theatre.json to ship the edits.
import { getProject, types as t, type IProjectConfig } from '@theatre/core'

const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./feature-scaling.theatre.json', { eager: true, import: 'default' }),
)[0]

const NS = 'http://www.w3.org/2000/svg'
const D = 30 // story length in seconds
const SEQ = 10 // Theatre's default sequence length; we play it at D/SEQ slower speed

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// Seeded data so every render is identical: income loosely grows with age.
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const data = Array.from({ length: 60 }, () => {
  const age = 10 + rnd() * 90
  return { age, inc: clamp(1000 + (age - 10) * 80 + (rnd() - 0.5) * 3500, 1000, 10000) }
})

// Gradient descent on L = ½(ax·x² + ay·y²), in unit coordinates centred on the minimum.
const gd = (ax: number, ay: number, lr: number, n: number) => {
  let x = -0.9, y = 0.7
  const pts: [number, number][] = [[x, y]]
  for (let i = 0; i < n; i++) { x -= lr * ax * x; y -= lr * ay * y; pts.push([x, y]) }
  return pts
}
const zigPts = gd(0.15, 3.6, 0.52, 26) // stretched bowl: zig-zags on the steep axis, crawls on the flat one
const strPts = gd(1, 1, 0.35, 26) // round bowl: walks straight to the minimum

const slides = [
  ['Unscaled features', 'age ∈ [10, 100]  ·  income ∈ [1 000, 10 000]', 'On one shared axis, age collapses into a sliver.'],
  ['Min–max scaling', 'every feature mapped into [0, 1]', 'Same data, same shape — now both features speak at the same volume.'],
  ['Why it matters: the loss surface', 'gradient descent, unscaled vs scaled', 'Stretched contours make GD zig-zag. Round ones let it walk straight in.'],
]

export default function mount(host: HTMLElement) {
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

  // ---------- Theatre: editable layout, style and timing ----------
  const project = getProject('AtoZAI · Feature Scaling', savedState ? { state: savedState } : {})
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
  const beats = sheet.object('Beats', {
    slide2: t.number(9, { range: [0, D] }),
    slide3: t.number(19, { range: [0, D] }),
  })

  // ---------- scene graph ----------
  const gPlot = el('g'), gAxes = el('g', {}, gPlot), gPts = el('g', {}, gPlot)
  const gContour = el('g', {}, gPlot), gPath = el('g', {}, gPlot)
  const box = el('rect', { fill: 'none', stroke: '#4d8bff', 'stroke-dasharray': '3 5' }, gPlot)
  const axX = el('line', { stroke: '#3a3a37' }, gAxes), axY = el('line', { stroke: '#3a3a37' }, gAxes)
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const tickX = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes)
  const tickY = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes)
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'AGE'; labY.textContent = 'INCOME'
  const dots = data.map(() => el('circle', {}, gPts))
  const ellipses = [1, 2, 3, 4, 5].map(() => el('ellipse', { fill: 'none', stroke: '#2e2e2b', 'stroke-width': 1.5 }, gContour))
  const zig = el('path', { fill: 'none', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, gPath)
  const straight = el('path', { fill: 'none', 'stroke-width': 2.5 }, gPath)
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const formula = el('g')
  ;['x′ = (x − min) / (max − min)', 'age′ = (age − 10) / 90', 'income′ = (income − 1000) / 9000'].forEach((s, i) => {
    el('text', { y: i * 36, fill: i ? '#8d8c86' : '#ededea', 'font-size': i ? 18 : 22, 'font-family': 'JetBrains Mono Variable, monospace' }, formula).textContent = s
  })

  function render() {
    const L = layout.value, S = style.value, B = beats.value
    const p = sheet.sequence.position * (D / SEQ)
    const slide = p < B.slide2 ? 0 : p < B.slide3 ? 1 : 2
    const local = p - [0, B.slide2, B.slide3][slide]
    const scaled = seg(p, B.slide2, B.slide2 + 3)
    const lossView = seg(p, B.slide3, B.slide3 + 1.5)
    const { x: cx, y: cy, size } = L.plot, half = size / 2

    // text
    const fade = seg(local, 0, 0.8)
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    ;[title.textContent, sub.textContent, caption.textContent] = slides[slide]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / 03 — ${slides[slide][1]}`.toUpperCase()
    set(formula, { transform: `translate(${L.formula.x},${L.formula.y})`, opacity: slide === 1 ? seg(local, 0.5, 1.5) : 0 })

    // axes + scatter: shared 0..10 000 axis → each feature in [0, 1]
    const scatter = 1 - lossView
    set(gAxes, { opacity: scatter }); set(gPts, { opacity: scatter })
    set(box, { x: cx - half, y: cy - half, width: size, height: size, opacity: scaled * scatter })
    set(axX, { x1: cx - half, y1: cy + half, x2: cx + half, y2: cy + half })
    set(axY, { x1: cx - half, y1: cy + half, x2: cx - half, y2: cy - half })
    tickX.textContent = tickY.textContent = scaled > 0.5 ? '1' : '10 000'
    set(tickX, { x: cx + half, y: cy + half + 20 }); set(tickY, { x: cx - half - 8, y: cy - half + 4 })
    set(labX, { x: cx, y: cy + half + 40 })
    set(labY, { transform: `translate(${cx - half - 44},${cy}) rotate(-90)` })
    data.forEach((d, i) => {
      const k = seg(p, B.slide2 + i * 0.02, B.slide2 + 2 + i * 0.02)
      const nx = lerp(d.age / 10000, (d.age - 10) / 90, k)
      const ny = lerp(d.inc / 10000, (d.inc - 1000) / 9000, k)
      set(dots[i], {
        cx: cx - half + nx * size, cy: cy + half - ny * size,
        r: S.pointRadius * (0.4 + 0.6 * seg(p, 0.3 + i * 0.03, 1 + i * 0.03)),
        fill: rgba(k > 0.5 ? S.after : S.before),
      })
    })

    // loss contours: always drawn round (the scaled bowl); the zig-zag path still shows the unscaled run
    const round = seg(p, B.slide3 + 6, B.slide3 + 7.5)
    set(gContour, { opacity: lossView }); set(gPath, { opacity: lossView })
    ellipses.forEach((e, i) => {
      const r = ((i + 1) / 5) * half
      set(e, { cx, cy, rx: r, ry: r })
    })
    const path = (pts: [number, number][], frac: number, sy: number) =>
      pts.slice(0, Math.max(1, Math.floor(frac * (pts.length - 1))) + 1)
        .map(([x, y], j) => `${j ? 'L' : 'M'}${cx + x * half} ${cy - y * half * sy}`).join(' ')
    set(zig, { d: path(zigPts, seg(p, B.slide3 + 1.5, B.slide3 + 5.5), 0.22), stroke: rgba(S.before), opacity: 1 - round * 0.7 })
    set(straight, { d: path(strPts, seg(p, B.slide3 + 8, B.slide3 + 10), 1), stroke: rgba(S.after), opacity: round })
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
  const tick = () => { time.textContent = `${(sheet.sequence.position * (D / SEQ)).toFixed(1).padStart(4, '0')}s` }

  let playing = false
  const play = async () => {
    if (sheet.sequence.position >= SEQ - 0.01) sheet.sequence.position = 0
    playing = true; playBtn.textContent = '❚❚ Pause'; playBtn.setAttribute('aria-pressed', 'true')
    await sheet.sequence.play({ rate: SEQ / D })
    playing = false; playBtn.textContent = '▶ Play'; playBtn.setAttribute('aria-pressed', 'false')
  }
  playBtn.onclick = () => (playing ? sheet.sequence.pause() : play())
  restartBtn.onclick = () => { sheet.sequence.position = 0; play() }

  // render on Theatre edits and whenever the playhead moves
  for (const o of [layout, style, beats]) o.onValuesChange(render)
  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) sheet.sequence.pause() }).observe(host)
  const loop = () => { if (visible) { render(); tick() } requestAnimationFrame(loop) }
  project.ready.then(() => {
    render(); loop()
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play()
    else sheet.sequence.position = SEQ // show the final frame
  })
}

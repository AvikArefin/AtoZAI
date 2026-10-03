// __TOPIC__ explainer: __ONE_LINE_STORY__ (e.g. "raw data → transform → why it matters").
// Every position, size, colour and timing is a Theatre.js prop: tune it in Studio (`npm run dev`),
// export the JSON to src/scenes/__NAME__.theatre.json to ship the edits.
import { getProject, types as t, type IProjectConfig } from '@theatre/core'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./__NAME__.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants: do not change SEQ ----------
const NS = 'http://www.w3.org/2000/svg'
const D = 24 // story length in seconds (8–10 s per slide)
const SEQ = 10 // Theatre's default sequence length. Never change; we play it slower instead.

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
/** 0 before `a`, 1 after `b`, eased in between. The ONLY way to animate. */
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: deterministic (seeded), computed once ----------
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const points = Array.from({ length: 40 }, () => ({ x: rnd(), y: rnd() })) // __REPLACE with real data__

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['__Slide 1 title__', '__short subtitle__', '__one-sentence caption__'],
  ['__Slide 2 title__', '__short subtitle__', '__one-sentence caption__'],
  ['__Slide 3 title__', '__short subtitle__', '__one-sentence caption__'],
]

export default function mount(host: HTMLElement) {
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
  const project = getProject('AtoZAI · __TOPIC__', savedState ? { state: savedState } : {})
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(640, 390), size: t.number(420, { range: [200, 640] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt
    pointRadius: t.number(5, { range: [1, 14] }),
  })
  const beats = sheet.object('Beats', {
    slide2: t.number(8, { range: [0, D] }),
    slide3: t.number(16, { range: [0, D] }),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const gPlot = el('g')
  const dots = points.map(() => el('circle', {}, gPlot))

  // ---------- 9. render: pure function of (Theatre values, playhead). Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, B = beats.value
    const p = sheet.sequence.position * (D / SEQ) // story time in seconds, 0..D
    const slide = p < B.slide2 ? 0 : p < B.slide3 ? 1 : 2
    const local = p - [0, B.slide2, B.slide3][slide] // seconds since this slide began
    const { x: cx, y: cy, size } = L.plot, half = size / 2

    // text (fades in at the start of each slide)
    const fade = seg(local, 0, 0.8)
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // __REPLACE: the visual story. Example: dots appear, then move on slide 2
    const k = seg(p, B.slide2, B.slide2 + 2)
    points.forEach((d, i) => {
      set(dots[i], {
        cx: cx - half + d.x * size,
        cy: cy + half - lerp(d.y, d.x, k) * size,
        r: S.pointRadius * seg(p, 0.2 + i * 0.03, 0.8 + i * 0.03),
        fill: rgba(k > 0.5 ? S.after : S.before),
      })
    })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — __TOPIC__'
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

  for (const o of [layout, style, beats]) o.onValuesChange(render)
  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) sheet.sequence.pause() }).observe(host)
  const loop = () => { if (visible) { render(); tick() } requestAnimationFrame(loop) }
  project.ready.then(() => {
    render(); loop()
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play()
    else sheet.sequence.position = SEQ // reduced motion: show the final frame
  })
}

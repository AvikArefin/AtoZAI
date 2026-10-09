// Search-space boundaries explainer: best trials sit at the edge of a narrow search → widen it and the
// best trials land mid-range → infeasible trials pile up where training breaks down.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/search-space-boundaries/), export the JSON to src/scenes/search-space-boundaries.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./search-space-boundaries.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 28 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once search-space-boundaries.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [19, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [19, 0], [19.8, 1]],
    axesIn: [[0.2, 0], [1.2, 1]],
    narrowIn: [[1, 0], [2.8, 1]], // the trials of the narrow search appear
    top3: [[3.6, 0], [4.6, 1]], // its 3 best trials turn into stars
    edge: [[5.2, 0], [6.4, 1], [19, 1], [20, 0]], // the upper edge of the narrow search
    expand: [[9.6, 0, 'ease'], [12.1, 1]], // axes glide from the narrow plot's ranges to the wide plot's
    moreIn: [[12.4, 0], [14.2, 1]], // the trials beyond 2×10⁻⁴ appear
    reRank: [[15, 0], [16.5, 1]], // the stars pass to the 3 best trials of the whole study
    bands: [[20, 0], [21.8, 1]], // per-decade share of infeasible trials
    focus: [[20, 0], [21.2, 1]], // feasible dots dim, × marks grow
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`
const mix = (c: RGBA, d: RGBA, k: number): RGBA => ({ r: lerp(c.r, d.r, k), g: lerp(c.g, d.g, k), b: lerp(c.b, d.b, k), a: lerp(c.a, d.a, k) })
const GREY: RGBA = { r: 0.553, g: 0.549, b: 0.525, a: 1 } // #8d8c86

// ---------- 4. data: real trials, traced from the original figures ----------
// Traced from google-research/tuning_playbook assets/bad_search_space.png and assets/good_search_space.png
// (CC BY 4.0). Both plots show the same study of 100 trials: the "bad" plot is exactly its trials with a
// peak learning rate below 2×10⁻⁴, so trials there were read from it (3× finer x scale), the rest from the
// "good" plot. Markers were separated by template fitting; positions are within ~1 px of the originals.
// [peak learning rate, error rate on the validation set] for the 63 feasible trials.
const FEASIBLE: [number, number][] = [
  [1.49e-5, 0.771], [1.61e-5, 0.610], [2.01e-5, 0.703], [2.15e-5, 0.699], [2.17e-5, 0.694], [2.18e-5, 0.712],
  [2.52e-5, 0.649], [2.55e-5, 0.649], [2.75e-5, 0.716], [2.78e-5, 0.649], [2.83e-5, 0.629], [3.87e-5, 0.666],
  [4.10e-5, 0.530], [4.47e-5, 0.529], [4.68e-5, 0.559], [4.96e-5, 0.476], [5.41e-5, 0.461], [7.40e-5, 0.398],
  [7.62e-5, 0.329], [7.68e-5, 0.684], [8.38e-5, 0.379], [8.62e-5, 0.678], [8.70e-5, 0.359], [9.39e-5, 0.364],
  [1.02e-4, 0.355], [1.09e-4, 0.348], [1.15e-4, 0.354], [1.59e-4, 0.437], [1.74e-4, 0.290], [1.85e-4, 0.336],
  [1.86e-4, 0.291], [1.90e-4, 0.285], [2.14e-4, 0.280], [2.32e-4, 0.345], [2.56e-4, 0.339], [2.61e-4, 0.753],
  [2.87e-4, 0.266], [4.32e-4, 0.248], [4.57e-4, 0.256], [4.88e-4, 0.440], [5.02e-4, 0.274], [5.55e-4, 0.249],
  [5.58e-4, 0.323], [5.90e-4, 0.795], [7.89e-4, 0.279], [1.02e-3, 0.736], [1.06e-3, 0.254], [1.17e-3, 0.379],
  [1.25e-3, 0.252], [1.38e-3, 0.305], [1.41e-3, 0.256], [1.45e-3, 0.235], [2.00e-3, 0.227], [2.63e-3, 0.262],
  [2.72e-3, 0.241], [2.77e-3, 0.318], [2.85e-3, 0.607], [6.12e-3, 0.427], [6.65e-3, 0.332], [6.99e-3, 0.403],
  [2.24e-2, 0.732], [3.53e-2, 0.789], [5.67e-2, 0.482],
]
// Peak learning rates of the 37 infeasible trials; the originals draw them at error 0.8.
const INFEASIBLE: number[] = [
  1.02e-5, 1.03e-5, 1.19e-5, 1.54e-5, 9.12e-5, 8.11e-4, 1.51e-3, 1.95e-3, 2.62e-3, 3.87e-3, 4.76e-3, 5.09e-3,
  6.32e-3, 6.58e-3, 7.82e-3, 7.95e-3, 8.45e-3, 9.83e-3, 1.22e-2, 1.27e-2, 1.34e-2, 1.48e-2, 1.57e-2, 1.62e-2,
  1.86e-2, 2.27e-2, 2.50e-2, 2.82e-2, 3.09e-2, 3.73e-2, 4.17e-2, 4.39e-2, 6.41e-2, 7.01e-2, 7.05e-2, 7.21e-2,
  8.81e-2,
]
const INFEASIBLE_Y = 0.8
const NARROW_MAX = 2e-4 // upper edge of the narrow search (its trials stop at 1.90e-4; the next is 2.14e-4)
// Axis ranges of the two original plots: x as log10(peak learning rate), y as error rate.
const X_NARROW = [Math.log10(8.8e-6), Math.log10(2.2e-4)], Y_NARROW = [0.26, 0.826]
const X_WIDE = [Math.log10(6.48e-6), Math.log10(0.138)], Y_WIDE = [0.198, 0.829]
const DECADES = [-5, -4, -3, -2, -1]
const DECADE_LABELS = ['10⁻⁵', '10⁻⁴', '10⁻³', '10⁻²', '10⁻¹']
const MINORS = [-6, -5, -4, -3, -2]
  .flatMap((d) => [2, 3, 4, 5, 6, 7, 8, 9].map((m) => m * 10 ** d))
  .filter((lr) => Math.log10(lr) > X_WIDE[0] && Math.log10(lr) < X_WIDE[1])
const Y_TICKS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

type Trial = { lr: number; err: number; narrow: boolean; topNarrow: boolean; topWide: boolean }
const trials: Trial[] = FEASIBLE.map(([lr, err]) => ({ lr, err, narrow: lr <= NARROW_MAX, topNarrow: false, topWide: false }))
// "Top 3 trials" = lowest error. In the narrow view these are the best 3 below 2×10⁻⁴ (the bad plot's stars);
// in the whole study they are 3 other trials (the good plot's stars).
const best3 = (list: Trial[]) => [...list].sort((a, b) => a.err - b.err).slice(0, 3)
const topNarrow = best3(trials.filter((d) => d.narrow)), topWide = best3(trials)
topNarrow.forEach((d) => (d.topNarrow = true))
topWide.forEach((d) => (d.topWide = true))
const nNarrow = trials.filter((d) => d.narrow).length + INFEASIBLE.filter((lr) => lr <= NARROW_MAX).length
const nAll = trials.length + INFEASIBLE.length

// Share of infeasible trials in each decade of peak learning rate (slide 3).
const BANDS = [-5, -4, -3, -2].map((d) => {
  const inside = (lr: number) => lr >= 10 ** d && lr < 10 ** (d + 1)
  const inf = INFEASIBLE.filter(inside).length, total = inf + trials.filter((x) => inside(x.lr)).length
  return { d, share: total ? inf / total : 0 }
})

// Unit five-pointed star, scaled in render.
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1
  return `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`
}).join('') + 'Z'

// ---------- 5. slide text: [title, subtitle, caption] ----------
const f3 = (x: number) => x.toFixed(3)
const slides: [string, string, string][] = [
  ['Best trials at the edge', `narrow search · peak LR 10⁻⁵ to 2×10⁻⁴ · ${nNarrow} trials`,
    'The 3 best (lowest-error) trials all sit at the upper edge. A better one may lie past it.'],
  ['Widen the search space', `wider search · peak LR up to 10⁻¹ · ${nAll} trials`,
    `With room to grow, the top 3 sit mid-range and the best error drops ${f3(topNarrow[0].err)} → ${f3(topWide[0].err)}.`],
  ['Where training breaks down', 'infeasible trials · share per decade of peak learning rate',
    'Failed trials (×) pile up above 10⁻³. The best trials sit right where failures begin.'],
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
  const project = getProject('AtoZAI · Search Space Bounds', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const offset = (dx: number, dy: number) => t.compound({ dx: t.number(dx, { range: [-300, 300] }), dy: t.number(dy, { range: [-300, 300] }) })
  const layout = sheet.object('Layout', {
    plot: t.compound({ ...pos(150, 180), width: t.number(1050, { range: [300, 1100] }), height: t.number(400, { range: [150, 460] }) }),
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    // Labels hang off the data they name: offsets in px from their anchor point.
    feasibleLabel: offset(0, 0), // anchor: (3.2×10⁻⁵, 0.75)
    infeasibleLabel: offset(0, 5), // anchor: (2×10⁻⁵, 0.8)
    topNarrowLabel: offset(-16, 5), // anchor: left-most narrow star, right-aligned
    topWideLabel: offset(16, 5), // anchor: right-most wide star
    edgeLabel: t.compound({ dx: t.number(-12, { range: [-300, 300] }), y: t.number(250, { range: [0, 720] }) }),
    bandLabelDy: t.number(-12, { range: [-60, 60] }),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: infeasible trials, the edge problem
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: feasible trials
    top: t.rgba({ r: 0.929, g: 0.929, b: 0.918, a: 1 }), // #ededea: top-3 stars
    pointRadius: t.number(5, { range: [1, 14] }),
    dotOpacity: t.number(0.9, { range: [0, 1] }),
    starRadius: t.number(10, { range: [3, 24] }),
    crossSize: t.number(5, { range: [2, 14] }),
    crossWidth: t.number(2, { range: [1, 4] }),
    bandOpacity: t.number(0.22, { range: [0, 1] }),
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), axesIn: progress(), narrowIn: progress(), top3: progress(), edge: progress(0),
    expand: progress(), moreIn: progress(), reRank: progress(), bands: progress(), focus: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })
  const gPlot = el('g')
  const bandRects = BANDS.map(() => el('rect', {}, gPlot))
  const bandTexts = BANDS.map((b) => {
    const e = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gPlot)
    e.textContent = `${Math.round(b.share * 100)}% INFEASIBLE`
    return e
  })
  const gAxes = el('g', {}, gPlot)
  const gridX = DECADES.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const gridY = Y_TICKS.map(() => el('line', { stroke: '#2e2e2b', 'stroke-width': 1 }, gAxes))
  const axX = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes), axY = el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes)
  const tickX = DECADES.map(() => el('line', { stroke: '#3a3a37', 'stroke-width': 1.5 }, gAxes))
  const minorX = MINORS.map(() => el('line', { stroke: '#3a3a37', 'stroke-width': 1 }, gAxes))
  const tickXText = DECADE_LABELS.map((s) => {
    const e = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'middle' }, gAxes)
    e.textContent = s
    return e
  })
  const tickYText = Y_TICKS.map((v) => {
    const e = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gAxes)
    e.textContent = v.toFixed(1)
    return e
  })
  const labX = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  const labY = el('text', { ...LABEL, 'font-size': 14, 'text-anchor': 'middle' }, gAxes)
  labX.textContent = 'PEAK LEARNING RATE'; labY.textContent = 'ERROR RATE ON THE VALIDATION SET'
  const edgeLine = el('line', { 'stroke-width': 2, 'stroke-dasharray': '6 6' }, gPlot)
  const edgeText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gPlot)
  const crosses = INFEASIBLE.map(() => el('path', { fill: 'none', 'stroke-linecap': 'round' }, gPlot))
  const dots = trials.map(() => el('circle', {}, gPlot))
  const starsNarrow = topNarrow.map(() => el('path', { d: STAR }, gPlot))
  const starsWide = topWide.map(() => el('path', { d: STAR }, gPlot))
  const feasText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  const infText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  const topNarrowText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' }, gPlot)
  const topWideText = el('text', { ...LABEL, 'font-size': 13 }, gPlot)
  feasText.textContent = 'FEASIBLE'; infText.textContent = 'INFEASIBLE'
  topNarrowText.textContent = `TOP 3 · BEST ${f3(topNarrow[0].err)}`
  topWideText.textContent = `TOP 3 · BEST ${f3(topWide[0].err)}`

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)
    const { x: px, y: py, width: w, height: h } = L.plot

    // the axes glide from the narrow plot's ranges to the wide plot's (x is log10 of the learning rate)
    const k = T.expand
    const x0 = lerp(X_NARROW[0], X_WIDE[0], k), x1 = lerp(X_NARROW[1], X_WIDE[1], k)
    const y0 = lerp(Y_NARROW[0], Y_WIDE[0], k), y1 = lerp(Y_NARROW[1], Y_WIDE[1], k)
    const X = (lr: number) => px + ((Math.log10(lr) - x0) / (x1 - x0)) * w
    const Y = (e: number) => py + h - ((e - y0) / (y1 - y0)) * h
    const onX = (x: number) => (x >= px - 0.5 && x <= px + w + 0.5 ? 1 : 0)
    const onY = (y: number) => (y >= py - 0.5 && y <= py + h + 0.5 ? 1 : 0)

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // axes, gridlines and ticks; a tick shows only while it lies inside the current range
    set(gAxes, { opacity: T.axesIn })
    set(axX, { x1: px, y1: py + h, x2: px + w, y2: py + h })
    set(axY, { x1: px, y1: py + h, x2: px, y2: py })
    set(labX, { x: px + w / 2, y: py + h + 52 })
    set(labY, { transform: `translate(${px - 62},${py + h / 2}) rotate(-90)` })
    DECADES.forEach((d, i) => {
      const x = X(10 ** d), on = onX(x)
      set(gridX[i], { x1: x, y1: py, x2: x, y2: py + h, opacity: on })
      set(tickX[i], { x1: x, y1: py + h, x2: x, y2: py + h + 7, opacity: on })
      set(tickXText[i], { x, y: py + h + 26, opacity: on })
    })
    MINORS.forEach((lr, i) => {
      const x = X(lr)
      set(minorX[i], { x1: x, y1: py + h, x2: x, y2: py + h + 4, opacity: onX(x) })
    })
    Y_TICKS.forEach((v, i) => {
      const y = Y(v), on = onY(y)
      set(gridY[i], { x1: px, y1: y, x2: px + w, y2: y, opacity: on })
      set(tickYText[i], { x: px - 12, y: y + 4, opacity: on })
    })

    // slide 3: one band per decade, as opaque as the share of its trials that were infeasible
    BANDS.forEach((b, i) => {
      const xa = clamp(X(10 ** b.d), px, px + w), xb = clamp(X(10 ** (b.d + 1)), px, px + w)
      set(bandRects[i], { x: xa, y: py, width: Math.max(0, xb - xa), height: h, fill: rgba(S.before), opacity: S.bandOpacity * b.share * T.bands })
      set(bandTexts[i], { x: (xa + xb) / 2, y: py + L.bandLabelDy, fill: rgba(S.before), opacity: T.bands })
    })

    // the narrow search's upper edge: orange while it is the problem, grey once the range has grown past it
    const xe = X(NARROW_MAX), edgeCol = rgba(mix(S.before, GREY, k))
    set(edgeLine, { x1: xe, y1: py, x2: xe, y2: py + h, stroke: edgeCol, opacity: T.edge })
    set(edgeText, { x: xe + L.edgeLabel.dx, y: L.edgeLabel.y, fill: edgeCol, opacity: T.edge * fade })
    edgeText.textContent = slide === 0 ? 'EDGE OF SEARCH SPACE' : 'OLD EDGE'

    // infeasible trials: orange × at error 0.8, as in the originals
    const s = S.crossSize * (1 + 0.35 * T.focus), yInf = Y(INFEASIBLE_Y)
    INFEASIBLE.forEach((lr, i) => {
      const x = X(lr)
      set(crosses[i], {
        d: `M${x - s} ${yInf - s}L${x + s} ${yInf + s}M${x - s} ${yInf + s}L${x + s} ${yInf - s}`,
        stroke: rgba(S.before), 'stroke-width': S.crossWidth, opacity: lr <= NARROW_MAX ? T.narrowIn : T.moreIn,
      })
    })

    // feasible trials: cobalt dots; a top-3 trial swaps its dot for a star
    const starN = T.top3 * (1 - T.reRank), starW = T.reRank
    const dotAlpha = S.dotOpacity * (1 - 0.65 * T.focus)
    trials.forEach((d, i) => {
      const asStar = d.topNarrow ? starN : d.topWide ? starW : 0
      set(dots[i], {
        cx: X(d.lr), cy: Y(d.err), r: S.pointRadius * (d.narrow ? T.narrowIn : T.moreIn),
        fill: rgba(S.after), opacity: dotAlpha * (1 - asStar),
      })
    })
    const star = (e: Element, d: Trial, o: number) =>
      set(e, { transform: `translate(${X(d.lr)},${Y(d.err)}) scale(${S.starRadius})`, fill: rgba(S.top), opacity: o })
    topNarrow.forEach((d, i) => star(starsNarrow[i], d, starN * T.narrowIn))
    topWide.forEach((d, i) => star(starsWide[i], d, starW * T.moreIn))

    // in-place legend
    set(feasText, { x: X(3.2e-5) + L.feasibleLabel.dx, y: Y(0.75) + L.feasibleLabel.dy, fill: rgba(S.after), opacity: T.narrowIn * (1 - 0.5 * T.focus) })
    set(infText, { x: X(2e-5) + L.infeasibleLabel.dx, y: yInf + L.infeasibleLabel.dy, fill: rgba(S.before), opacity: T.narrowIn })
    const meanY = (list: Trial[]) => list.reduce((a, d) => a + Y(d.err), 0) / list.length
    set(topNarrowText, {
      x: Math.min(...topNarrow.map((d) => X(d.lr))) + L.topNarrowLabel.dx, y: meanY(topNarrow) + L.topNarrowLabel.dy,
      fill: rgba(S.top), opacity: starN * T.narrowIn,
    })
    set(topWideText, {
      x: Math.max(...topWide.map((d) => X(d.lr))) + L.topWideLabel.dx, y: meanY(topWide) + L.topWideLabel.dy,
      fill: rgba(S.top), opacity: starW * T.moreIn,
    })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Search space boundaries'
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

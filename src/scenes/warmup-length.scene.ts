// Warmup-length explainer: five ramps to the same peak LR → the short ones blow up after reaching full LR → only the 40k ramp keeps falling.
// Positions, sizes and colours are Theatre.js props; every animated value is a keyframed track on the
// timeline. Tune both in Studio (`npm run dev`, /AtoZAI/studio/warmup-length/), export the JSON to src/scenes/warmup-length.theatre.json to ship.
import { getProject, types as t, val, type IProjectConfig } from '@theatre/core'
import { initialState, type Tracks } from './timeline'
import type { SceneOptions } from './mount'

// ---------- 1. saved Studio edits (optional file, picked up automatically) ----------
const savedState = Object.values(
  import.meta.glob<IProjectConfig['state']>('./warmup-length.theatre.json', { eager: true, import: 'default' }),
)[0]

// ---------- 2. constants + starting keyframes ----------
const NS = 'http://www.w3.org/2000/svg'
const LENGTH = 29 // story length in seconds (8–10 s per slide); the sequence plays at 1 unit = 1 s

// [seconds, value, curve to next: 'linear' (default) | 'ease' | 'hold']. Studio shows each as a track.
// Once warmup-length.theatre.json exists it wins, so later retiming happens in Studio, not here.
const TRACKS: Tracks = {
  Timeline: {
    slide: [[0, 0, 'hold'], [9, 1, 'hold'], [19, 2]],
    text: [[0, 0], [0.8, 1, 'hold'], [9, 0], [9.8, 1, 'hold'], [19, 0], [19.8, 1]],
    lrAxes: [[0.2, 0], [1.2, 1]],
    lrLabels: [[1.2, 0], [2.2, 1]],
    lrDraw: [[1.4, 0], [6.4, 1]],
    dock: [[9, 0, 'ease'], [10.8, 1]],
    lossAxes: [[10.2, 0], [11.2, 1]],
    failDraw: [[11.2, 0], [16, 1]],
    failLabels: [[14.6, 0], [15.6, 1]],
    rampEnds: [[16.4, 0], [17.4, 1]],
    dimFail: [[19.3, 0], [20.3, 1]],
    goodDraw: [[20.3, 0], [25, 1]],
    goodLabel: [[25, 0], [26, 1]],
  },
}

// ---------- 3. helpers: copy as-is ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
type RGBA = { r: number; g: number; b: number; a: number }
const rgba = (c: RGBA) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${c.a})`

// ---------- 4. data: traced from the original figure, computed once ----------
// Train loss against global step for five post-LN transformer runs that differ only in warmup length.
// Traced from google-research/tuning_playbook assets/instability_during_warmup.png (CC BY 4.0), left panel,
// as [step, train loss] at every bend of the plotted line. Loss is kept to 0.01 so the log axis shows no
// rounding steps; the tracing itself is good to about ±1 px of the 400 px original (≈ ±1 % in loss). Where the
// blown-up runs overlap around loss 10 the zigzags are approximate, and before step ~30 the runs lie under
// one another. The 10 000 and 40 000 runs were logged only to ~4×10⁴ steps.
type Pt = [x: number, y: number]
const LOSS_1: Pt[] = [
  [1, 10.39], [2, 10.21], [3, 9.82], [4, 9.62], [5, 9.33], [6, 9.12], [7, 8.91], [8, 8.73], [9, 8.54],
  [10, 8.36], [11, 8.22], [13, 7.97], [15, 7.77], [16, 7.73], [17, 7.58], [18, 7.57], [22, 7.37],
  [31, 7.39], [40, 7.31], [164, 7.31], [180, 7.28], [185, 7.24], [191, 7.24], [217, 7.37], [253, 7.34],
  [262, 7.31], [336, 7.29], [358, 7.24], [369, 7.24], [393, 7.37], [474, 7.34], [489, 7.31], [505, 7.34],
  [521, 8.02], [537, 8.2], [572, 9.1], [609, 9.26], [628, 9.47], [669, 9.48], [690, 9.53], [712, 9.8],
  [807, 9.79], [833, 9.75], [859, 9.43], [887, 9.41], [915, 9.43], [944, 9.69], [974, 9.69],
  [1070, 9.27], [1140, 8.36], [1170, 8.36], [1210, 8.69], [1370, 8.87], [1420, 8.87], [1510, 8.75],
  [1560, 8.75], [1660, 9.03], [1710, 9.03], [1820, 8.72], [1880, 8.72], [2000, 9.06], [2060, 9.06],
  [2200, 9.22], [2270, 9.22], [2410, 9.01], [2490, 9.01], [2650, 9.37], [2740, 9.37], [2820, 9.24],
  [2910, 8.84], [3000, 8.84], [3200, 9.18], [3410, 9.23], [3510, 9.33], [3740, 9.32], [3860, 9.25],
  [4110, 9.24], [4240, 9.28], [4370, 9.62], [4510, 9.62], [4660, 9.44], [4960, 9.43], [5120, 9.63],
  [5620, 9.67], [5800, 9.89], [5980, 9.89], [6370, 9.69], [7680, 9.57], [7930, 9.58], [8180, 9.84],
  [9570, 9.76], [10800, 10.1], [11200, 10.12], [11900, 10.1], [12300, 10.02], [12700, 10.02],
  [13500, 10.79], [13900, 10.79], [14400, 10.36], [14800, 10.25], [15800, 10.18], [16300, 9.93],
  [18500, 9.9], [20300, 9.99], [25200, 9.99], [26000, 9.85], [28600, 9.85], [31400, 9.68], [33500, 9.68],
  [41700, 10.12], [47200, 10.1], [51900, 10.21], [55200, 10.16], [58800, 10.21], [64600, 10.21],
  [66600, 9.71], [68700, 9.65], [80400, 9.65], [82900, 9.6], [94000, 9.6], [97000, 9.55], [103000, 9.58],
]
const LOSS_1000: Pt[] = [
  [1, 10.39], [5, 10.27], [6, 10.33], [8, 10.27], [9, 10.25], [10, 10.24], [11, 10.19], [12, 10.24],
  [13, 10.19], [18, 10.15], [27, 10.04], [29, 9.99], [38, 9.93], [50, 9.76], [53, 9.68], [56, 9.66],
  [58, 9.58], [62, 9.56], [64, 9.47], [75, 9.31], [77, 9.18], [82, 9.16], [85, 8.99], [90, 8.95],
  [93, 8.79], [99, 8.75], [102, 8.57], [109, 8.53], [112, 8.34], [120, 8.28], [140, 7.8], [144, 7.78],
  [154, 7.59], [159, 7.58], [169, 7.45], [174, 7.45], [197, 7.32], [262, 7.21], [270, 7.15], [306, 7.16],
  [326, 7.11], [347, 7.11], [369, 7.11], [381, 7.14], [418, 7.13], [521, 7], [554, 7], [572, 7.12],
  [609, 7.12], [628, 7.08], [690, 7.06], [915, 7.06], [1070, 7.06], [1100, 7.15], [1290, 7.11],
  [1370, 7.26], [1560, 7.27], [1660, 7.35], [1820, 7.41], [2200, 7.49], [2410, 7.5], [2490, 7.62],
  [2650, 8.57], [2820, 8.57], [2910, 8.4], [3100, 8.43], [3200, 8.5], [3630, 8.49], [3740, 8.53],
  [3860, 8.75], [4110, 8.81], [4240, 9.03], [4510, 9.04], [4660, 8.95], [4960, 8.93], [5450, 9.05],
  [5620, 9.26], [5980, 9.38], [6170, 9.79], [6370, 9.87], [7220, 9.86], [7450, 9.8], [7680, 9.8],
  [7930, 9.83], [8180, 10], [9270, 10.04], [9570, 10], [10200, 9.66], [10500, 9.66], [10800, 9.71],
  [13100, 9.8], [13900, 9.8], [14800, 9.97], [15300, 9.97], [15800, 9.68], [16300, 9.63], [17300, 9.63],
  [18500, 9.65], [19700, 9.84], [20300, 9.84], [23000, 10.05], [23700, 10.25], [24500, 10.25],
  [26000, 9.98], [29500, 9.98], [31400, 9.76], [33500, 9.76], [37900, 9.92], [44300, 9.93],
  [45800, 9.68], [48700, 9.63], [50300, 9.68], [51900, 10.05], [53500, 10.05], [55200, 9.93],
  [60600, 9.9], [62600, 10.38], [64600, 10.38], [66600, 10.15], [68700, 10.08], [77900, 10.13],
  [80400, 10.03], [85600, 10.02], [88300, 9.98], [97000, 9.7], [103000, 9.68],
]
const LOSS_4000: Pt[] = [
  [1, 10.39], [4, 10.39], [5, 10.39], [8, 10.33], [18, 10.27], [19, 10.21], [23, 10.21], [44, 10.02],
  [51, 10.01], [53, 9.96], [60, 9.96], [66, 9.89], [75, 9.88], [77, 9.83], [90, 9.78], [93, 9.74],
  [99, 9.73], [102, 9.66], [120, 9.57], [140, 9.31], [144, 9.3], [169, 9], [174, 8.99], [185, 8.78],
  [191, 8.76], [204, 8.59], [210, 8.56], [224, 8.35], [231, 8.32], [246, 8.09], [253, 8.08], [262, 8],
  [270, 7.85], [287, 7.79], [296, 7.61], [316, 7.57], [326, 7.45], [347, 7.44], [358, 7.36], [381, 7.32],
  [393, 7.26], [445, 7.22], [474, 7.16], [505, 7.15], [521, 7.09], [590, 7.03], [1070, 6.85],
  [1100, 6.77], [1460, 6.75], [1880, 6.64], [2000, 6.57], [2490, 6.57], [2910, 6.45], [3410, 6.4],
  [3510, 6.34], [4110, 6.29], [4240, 6.24], [4960, 6.17], [5120, 6.13], [5450, 6.15], [5800, 6.39],
  [6170, 7.12], [7000, 7.6], [7680, 8.87], [8440, 9.64], [8990, 9.66], [9870, 9.88], [11200, 9.88],
  [11500, 9.82], [11900, 9.41], [12300, 9.31], [12700, 9.31], [13500, 9.97], [13900, 9.97],
  [14400, 9.58], [14800, 9.47], [16800, 9.27], [17300, 9.32], [18500, 10.25], [19000, 10.25],
  [19700, 10.16], [21600, 10.13], [22300, 10.46], [24500, 10.53], [25200, 10.47], [26000, 10.17],
  [26900, 10.13], [30500, 10.16], [31400, 9.89], [32400, 9.89], [33500, 9.94], [34500, 10.24],
  [35600, 10.24], [37900, 10.11], [40400, 10.07], [41700, 9.84], [48700, 9.8], [50300, 9.83],
  [51900, 10.37], [58800, 10.58], [60600, 10.52], [62600, 10.09], [64600, 10.06], [66600, 9.83],
  [88300, 9.73], [91100, 9.58], [97000, 9.44], [103000, 9.44],
]
const LOSS_10000: Pt[] = [
  [1, 10.39], [2, 10.33], [3, 10.33], [7, 10.39], [8, 10.33], [11, 10.33], [12, 10.39], [13, 10.33],
  [16, 10.33], [17, 10.27], [18, 10.33], [19, 10.27], [32, 10.24], [36, 10.18], [51, 10.15], [53, 10.1],
  [64, 10.09], [99, 9.95], [102, 9.9], [120, 9.87], [174, 9.62], [185, 9.52], [210, 9.41], [246, 9.1],
  [253, 9.09], [270, 8.92], [287, 8.89], [296, 8.7], [316, 8.65], [326, 8.5], [347, 8.43], [358, 8.26],
  [381, 8.19], [393, 8.01], [418, 7.97], [432, 7.77], [445, 7.76], [459, 7.7], [474, 7.57], [505, 7.54],
  [521, 7.41], [554, 7.39], [572, 7.32], [669, 7.24], [690, 7.19], [807, 7.1], [833, 7.05], [974, 7.04],
  [1040, 6.96], [1070, 6.96], [1100, 6.87], [1170, 6.84], [1210, 6.79], [1330, 6.77], [1370, 6.66],
  [1460, 6.63], [1510, 6.56], [1560, 6.55], [1660, 6.45], [1710, 6.44], [1820, 6.3], [1880, 6.3],
  [1940, 6.25], [2000, 6.16], [2060, 6.16], [2200, 6.06], [2270, 6.06], [2410, 5.89], [2490, 5.89],
  [2650, 5.77], [2740, 5.77], [2910, 5.62], [3000, 5.61], [3200, 5.49], [3410, 5.48], [3510, 5.37],
  [3740, 5.36], [3980, 5.25], [4240, 5.23], [4370, 5.1], [4660, 5.09], [4810, 4.98], [4960, 4.96],
  [5120, 4.88], [5280, 4.85], [5620, 4.84], [5800, 4.73], [5980, 4.72], [6170, 4.62], [6570, 4.59],
  [6780, 4.5], [7450, 4.48], [7680, 4.35], [7930, 4.35], [8180, 4.27], [9570, 4.2], [10200, 4.12],
  [10500, 4.12], [11200, 4.06], [11500, 4.05], [12300, 4], [13900, 3.96], [14800, 3.9], [16800, 3.87],
  [17300, 3.83], [19000, 3.8], [19700, 3.77], [20900, 3.75], [21600, 3.75], [22300, 4.49], [23700, 8.39],
  [24500, 9.65], [25200, 9.65], [26000, 9.46], [26900, 9.46], [27700, 9.47], [28600, 9.62],
  [30500, 9.67], [31400, 10.31], [33500, 10.32], [35600, 9.92], [36800, 9.9],
]
const LOSS_40000: Pt[] = [
  [1, 10.39], [8, 10.45], [11, 10.41], [12, 10.45], [13, 10.41], [34, 10.38], [36, 10.35], [50, 10.33],
  [131, 10.1], [231, 9.9], [287, 9.77], [358, 9.55], [381, 9.52], [393, 9.44], [418, 9.4], [432, 9.31],
  [459, 9.25], [474, 9.15], [505, 9.1], [521, 8.98], [554, 8.95], [572, 8.8], [609, 8.75], [648, 8.55],
  [669, 8.53], [712, 8.32], [735, 8.3], [833, 7.9], [859, 7.85], [915, 7.82], [944, 7.6], [974, 7.6],
  [1000, 7.48], [1070, 7.41], [1100, 7.32], [1290, 7.21], [1370, 7.12], [1460, 7.09], [1510, 7.03],
  [1560, 7.03], [1660, 6.91], [1760, 6.87], [1820, 6.8], [1940, 6.78], [2000, 6.69], [2130, 6.68],
  [2200, 6.57], [2270, 6.57], [2340, 6.48], [2410, 6.44], [2490, 6.44], [2650, 6.34], [2740, 6.34],
  [3200, 6.1], [3410, 6.07], [3510, 5.96], [3740, 5.94], [3860, 5.86], [4110, 5.83], [4240, 5.75],
  [4510, 5.71], [4660, 5.62], [4960, 5.59], [5120, 5.51], [5450, 5.48], [5620, 5.39], [5980, 5.36],
  [6170, 5.27], [6570, 5.24], [6780, 5.14], [7220, 5.11], [7450, 5], [7930, 4.98], [8180, 4.89],
  [8710, 4.86], [9270, 4.74], [9570, 4.74], [10200, 4.62], [10500, 4.61], [11200, 4.49], [11500, 4.48],
  [12300, 4.35], [12700, 4.34], [13500, 4.22], [13900, 4.21], [16300, 3.95], [16800, 3.95], [17900, 3.9],
  [19000, 3.88], [19700, 3.84], [20900, 3.84], [21600, 3.79], [25200, 3.77], [26000, 3.74],
  [27700, 3.73], [28600, 3.7], [33500, 3.67], [34500, 3.62], [40400, 3.58],
]

// Learning-rate schedules, right panel of the same figure. Every traced point lies within 1.6 px of
// lr = 5×10⁻⁴ · min(1, (step − 1) / warmup), so the schedules are drawn from that formula, from the first
// logged step (2) to the last one plotted (10⁵, or 4×10⁴ for the 10 000 and 40 000 runs).
const PEAK_LR = 5e-4
const schedule = (w: number, last: number): Pt[] => {
  const a = Math.log10(2), b = Math.log10(last), steps = new Set<number>([w + 1])
  for (let i = 0; i <= 120; i++) steps.add(Math.round(10 ** lerp(a, b, i / 120)))
  return [...steps].filter(s => s <= last).sort((p, q) => p - q).map(s => [s, PEAK_LR * Math.min(1, (s - 1) / w)])
}

type Run = { warmup: number; name: string; loss: Pt[]; lr: Pt[] }
const RUNS: Run[] = [
  { warmup: 1, name: 'WARMUP 1', loss: LOSS_1, lr: schedule(1, 1e5) },
  { warmup: 1000, name: '1K', loss: LOSS_1000, lr: schedule(1000, 1e5) },
  { warmup: 4000, name: '4K', loss: LOSS_4000, lr: schedule(4000, 1e5) },
  { warmup: 10000, name: '10K', loss: LOSS_10000, lr: schedule(10000, 4e4) },
  { warmup: 40000, name: '40K', loss: LOSS_40000, lr: schedule(40000, 4e4) },
]
const GOOD = RUNS.length - 1 // the 40 000-step run; the others blow up

// Everything below is plotted in log10 space, as in the original (both panels are log–log).
const lg = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [Math.log10(x), Math.log10(y)])
const LOSS = RUNS.map(r => lg(r.loss)), LR = RUNS.map(r => lg(r.lr))
const lastX = (pts: Pt[]) => pts[pts.length - 1][0]

/** The part of a polyline (x increasing) left of x = xMax, ending exactly at xMax so drawing is continuous. */
const upTo = (pts: Pt[], xMax: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (p[0] <= xMax) { out.push(p); continue }
    if (i > 0) { const q = pts[i - 1]; out.push([xMax, lerp(q[1], p[1], (xMax - q[0]) / (p[0] - q[0]))]) }
    break
  }
  return out
}
const at = (pts: Pt[], x: number): Pt => { const p = upTo(pts, x); return p[p.length - 1] ?? pts[0] }
const lowest = (pts: Pt[]): Pt => pts.reduce((m, p) => (p[1] < m[1] ? p : m))

// Where each run's ramp reaches the peak LR, on both panels (warmup 1 is at full LR from its first step).
const RAMP_END = RUNS.map((r, i): { lr: Pt; loss: Pt } => {
  const x = Math.log10(Math.min(r.warmup, 10 ** lastX(LOSS[i])))
  return { lr: [x, Math.log10(PEAK_LR)], loss: at(LOSS[i], x) }
})
// Data points the loss labels hang from (a Theatre offset moves each label from here).
const LABEL_AT: Pt[] = [
  at(LOSS[0], Math.log10(30)), // warmup 1: its plateau
  at(LOSS[1], Math.log10(1700)), // 1k: creeping back up after its ramp ends
  lowest(LOSS[2]), // 4k: lowest point before the blow-up
  lowest(LOSS[3]), // 10k: lowest point, at the foot of its jump
  LOSS[GOOD][LOSS[GOOD].length - 1], // 40k: last logged point
]

// Axis ranges (log10) and tick labels, as in the original figure.
type Range = { x0: number; x1: number; y0: number; y1: number }
type Tick = [at: number, text: string]
const LOSS_AX: Range = { x0: -0.247, x1: 5.245, y0: 0.53, y1: 1.06 }
const LR_AX: Range = { x0: 0.068, x1: 5.222, y0: -8.14, y1: -3.064 }
const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const pow10 = (n: number) => `10${[...String(n)].map(c => SUP[c]).join('')}`
const LOSS_XT: Tick[] = [0, 1, 2, 3, 4, 5].map(n => [n, pow10(n)])
const LOSS_YT: Tick[] = [[Math.log10(4), '4×10⁰'], [Math.log10(6), '6×10⁰'], [1, '10¹']]
const LR_XT: Tick[] = [1, 2, 3, 4, 5].map(n => [n, pow10(n)])
const LR_YT: Tick[] = [-8, -7, -6, -5, -4].map(n => [n, pow10(n)])
const FAIL_END = Math.max(...LOSS.slice(0, GOOD).map(lastX)) // the failing runs' sweep ends at their last step
const LR_START = Math.log10(2), LR_END = Math.max(...LR.map(lastX))

// ---------- 5. slide text: [title, subtitle, caption] ----------
const slides: [string, string, string][] = [
  ['Same peak, longer ramps', 'post-LN transformer · learning-rate warmup', 'Five runs ramp linearly to the same peak learning rate, over 1 to 40 000 steps.'],
  ['Short ramps blow up', 'train loss · both axes log scale', 'Each short ramp blows up after reaching full LR: the loss shoots back to ~10 and stays there.'],
  ['40k steps of warmup', 'the only run still improving', 'Only the 40k ramp is still falling, down to 3.6, when its logged run ends at 4×10⁴ steps.'],
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
  const project = getProject('AtoZAI · Warmup Length', { state: savedState ?? initialState('Scene', LENGTH, TRACKS) })
  const sheet = project.sheet('Scene')
  const pos = (x: number, y: number) => ({ x: t.number(x, { range: [0, 1280] }), y: t.number(y, { range: [0, 720] }) })
  const box = (x: number, y: number, w: number, h: number) =>
    t.compound({ ...pos(x, y), width: t.number(w, { range: [200, 1100] }), height: t.number(h, { range: [150, 470] }) })
  const off = (dx: number, dy: number) => t.compound({ dx: t.number(dx, { range: [-200, 200] }), dy: t.number(dy, { range: [-200, 200] }) })
  const layout = sheet.object('Layout', {
    lossPlot: box(150, 170, 610, 410),
    lrBig: box(200, 170, 880, 410), // learning-rate panel on slide 1 …
    lrDocked: box(900, 170, 310, 410), // … and after it moves aside for the loss panel
    title: t.compound({ ...pos(64, 92), fontSize: t.number(44, { range: [16, 80] }) }),
    caption: t.compound(pos(64, 680)),
    lrLabel: off(10, 4), // schedule labels, from each ramp's first point
    lrLabel1: off(10, -10), // the flat warmup-1 schedule's label
    peakLabel: off(0, -10), // "peak LR" note, from the right end of the flat line
    label1: off(-20, 24), // loss labels, from the data points in LABEL_AT
    label1k: off(-8, -14),
    label4k: off(10, 18),
    label10k: off(10, -90),
    label40k: off(12, -6),
    rampNote: pos(170, 560),
  })
  const style = sheet.object('Style', {
    before: t.rgba({ r: 1, g: 0.353, b: 0.122, a: 1 }), // signal orange: runs that blow up
    after: t.rgba({ r: 0.302, g: 0.545, b: 1, a: 1 }), // cobalt: the 40k run
    lineWidth: t.number(2, { range: [1, 6] }),
    dotRadius: t.number(5, { range: [2, 12] }),
    opacity1: t.number(0.4, { range: [0, 1] }), // failing runs, shortest ramp faintest
    opacity1k: t.number(0.6, { range: [0, 1] }),
    opacity4k: t.number(0.8, { range: [0, 1] }),
    opacity10k: t.number(1, { range: [0, 1] }),
    dimTo: t.number(0.25, { range: [0, 1] }), // how far the failing runs fade on slide 3
  })
  // One prop per TRACKS entry, same names. Defaults only apply if a track is deleted: use the final frame.
  const progress = (v = 1) => t.number(v, { range: [0, 1] })
  const timeline = sheet.object('Timeline', {
    slide: t.number(2, { range: [0, 2] }),
    text: progress(), lrAxes: progress(), lrLabels: progress(), lrDraw: progress(), dock: progress(),
    lossAxes: progress(), failDraw: progress(), failLabels: progress(), rampEnds: progress(),
    dimFail: progress(), goodDraw: progress(), goodLabel: progress(),
  })

  // ---------- 8. scene graph: create every element ONCE, here ----------
  const LABEL = { fill: '#8d8c86', 'font-family': 'Departure Mono, monospace', 'letter-spacing': 1 }
  const title = el('text', { fill: '#ededea', 'font-weight': 600, 'font-family': 'Space Grotesk Variable, sans-serif', 'letter-spacing': -0.5 })
  const sub = el('text', { ...LABEL, 'font-size': 15 })
  const caption = el('text', { fill: '#ededea', 'font-size': 21 })

  // a log–log panel: gridlines at the labelled ticks, two axes, tick labels and axis names
  const panel = (xt: Tick[], yt: Tick[], xName: string, yName: string) => {
    const g = el('g')
    const grid = { stroke: '#2e2e2b', 'stroke-width': 1 }, axis = { stroke: '#3a3a37', 'stroke-width': 1.5 }
    const text = (s: string, anchor: string, size = 13) => {
      const e = el('text', { ...LABEL, 'font-size': size, 'text-anchor': anchor }, g)
      e.textContent = s
      return e
    }
    return {
      g, xt, yt,
      gx: xt.map(() => el('line', grid, g)), gy: yt.map(() => el('line', grid, g)),
      ax: el('line', axis, g), ay: el('line', axis, g),
      tx: xt.map(([, s]) => text(s, 'middle')), ty: yt.map(([, s]) => text(s, 'end')),
      nx: text(xName, 'middle', 14), ny: text(yName, 'middle', 14),
    }
  }
  const lossPanel = panel(LOSS_XT, LOSS_YT, 'GLOBAL STEP', 'TRAIN LOSS')
  const lrPanel = panel(LR_XT, LR_YT, 'GLOBAL STEP', 'LEARNING RATE')
  const curve = { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const lrPaths = RUNS.map(() => el('path', curve)) // the 40k run is last, so it draws on top
  const lossPaths = RUNS.map(() => el('path', curve))
  const ring = { fill: '#0d0d0d', 'stroke-width': 2 }
  const lrDots = RUNS.map(() => el('circle', ring)), lossDots = RUNS.map(() => el('circle', ring))
  const lrTexts = RUNS.map(r => { const e = el('text', { ...LABEL, 'font-size': 13 }); e.textContent = r.name; return e })
  const lossTexts = RUNS.map(r => { const e = el('text', { ...LABEL, 'font-size': 13 }); e.textContent = r.name; return e })
  const peakText = el('text', { ...LABEL, 'font-size': 13, 'text-anchor': 'end' })
  peakText.textContent = 'SAME PEAK · 5×10⁻⁴'
  const endText = el('text', { ...LABEL, 'font-size': 13 })
  endText.textContent = 'LOG ENDS'
  const noteRing = el('circle', { ...ring, stroke: '#8d8c86' }), noteText = el('text', { ...LABEL, 'font-size': 13 })
  noteText.textContent = 'RAMP REACHES FULL LR'

  // ---------- 9. render: pure function of the Theatre values. Only `set(...)` here ----------
  type Box = { x: number; y: number; width: number; height: number }
  const toPx = (b: Box, r: Range) => ({
    X: (x: number) => b.x + ((x - r.x0) / (r.x1 - r.x0)) * b.width,
    Y: (y: number) => b.y + b.height - ((y - r.y0) / (r.y1 - r.y0)) * b.height,
  })
  const place = (p: ReturnType<typeof panel>, b: Box, r: Range, opacity: number) => {
    const { X, Y } = toPx(b, r), bottom = b.y + b.height
    set(p.g, { opacity })
    p.xt.forEach(([v], i) => {
      set(p.gx[i], { x1: X(v), y1: b.y, x2: X(v), y2: bottom })
      set(p.tx[i], { x: X(v), y: bottom + 22 })
    })
    p.yt.forEach(([v], i) => {
      set(p.gy[i], { x1: b.x, y1: Y(v), x2: b.x + b.width, y2: Y(v) })
      set(p.ty[i], { x: b.x - 10, y: Y(v) + 4 })
    })
    set(p.ax, { x1: b.x, y1: bottom, x2: b.x + b.width, y2: bottom })
    set(p.ay, { x1: b.x, y1: b.y, x2: b.x, y2: bottom })
    set(p.nx, { x: b.x + b.width / 2, y: bottom + 48 })
    set(p.ny, { transform: `translate(${b.x - 62},${b.y + b.height / 2}) rotate(-90)` })
  }

  function render() {
    const L = layout.value, S = style.value, T = timeline.value
    const slide = clamp(Math.round(T.slide), 0, slides.length - 1)

    // text (the `text` track fades it in at the start of each slide)
    const fade = T.text
    set(title, { x: L.title.x, y: L.title.y, 'font-size': L.title.fontSize, opacity: fade })
    set(sub, { x: L.title.x, y: L.title.y - L.title.fontSize - 4, opacity: fade })
    set(caption, { x: L.caption.x, y: L.caption.y, opacity: fade })
    title.textContent = slides[slide][0]
    sub.textContent = `${String(slide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} — ${slides[slide][1]}`.toUpperCase()
    caption.textContent = slides[slide][2]

    // panels: the LR panel fills the stage on slide 1, then docks right to make room for the loss panel
    const B = L.lrBig, D = L.lrDocked
    const lrBox: Box = { x: lerp(B.x, D.x, T.dock), y: lerp(B.y, D.y, T.dock), width: lerp(B.width, D.width, T.dock), height: lerp(B.height, D.height, T.dock) }
    place(lrPanel, lrBox, LR_AX, T.lrAxes)
    place(lossPanel, L.lossPlot, LOSS_AX, T.lossAxes)
    const lr = toPx(lrBox, LR_AX), loss = toPx(L.lossPlot, LOSS_AX)
    const path = (m: { X: (x: number) => number; Y: (y: number) => number }, pts: Pt[]) =>
      pts.map(([x, y], j) => `${j ? 'L' : 'M'}${m.X(x).toFixed(1)} ${m.Y(y).toFixed(1)}`).join(' ')

    // colour per run: cobalt for 40k; orange for the rest, fainter for shorter ramps, dimmed on slide 3
    const dim = lerp(1, S.dimTo, T.dimFail)
    const failOpacity = [S.opacity1, S.opacity1k, S.opacity4k, S.opacity10k]
    const colour = (i: number) => rgba(i === GOOD ? S.after : S.before)
    const alpha = (i: number) => (i === GOOD ? 1 : failOpacity[i] * dim)

    // slide 1: the schedules draw left to right; labels sit at each ramp's first point
    const lrX = lerp(LR_START, LR_END, T.lrDraw), lrLabelOn = T.lrLabels * (1 - T.dock)
    LR.forEach((pts, i) => {
      set(lrPaths[i], { d: path(lr, upTo(pts, lrX)), stroke: colour(i), 'stroke-width': S.lineWidth, opacity: alpha(i) })
      const [x0, y0] = pts[0], o = i === 0 ? L.lrLabel1 : L.lrLabel
      set(lrTexts[i], { x: lr.X(x0) + o.dx, y: lr.Y(y0) + o.dy, fill: colour(i), opacity: lrLabelOn * (i === GOOD ? 1 : dim) })
    })
    set(peakText, { x: lrBox.x + lrBox.width + L.peakLabel.dx, y: lr.Y(Math.log10(PEAK_LR)) + L.peakLabel.dy, opacity: lrLabelOn })

    // slide 2: the four short-ramp runs draw in step, then rings mark where each ramp reached full LR
    const failX = lerp(0, FAIL_END, T.failDraw), goodX = lerp(0, lastX(LOSS[GOOD]), T.goodDraw)
    const labelOffsets = [L.label1, L.label1k, L.label4k, L.label10k, L.label40k]
    LOSS.forEach((pts, i) => {
      const good = i === GOOD
      set(lossPaths[i], { d: path(loss, upTo(pts, good ? goodX : failX)), stroke: colour(i), 'stroke-width': S.lineWidth, opacity: alpha(i) })
      const [ax, ay] = LABEL_AT[i], o = labelOffsets[i]
      set(lossTexts[i], { x: loss.X(ax) + o.dx, y: loss.Y(ay) + o.dy, fill: colour(i), opacity: good ? T.goodLabel : T.failLabels * dim })
      const ringOn = i === 0 ? 0 : good ? T.goodLabel : T.rampEnds * dim // warmup 1 has no ramp to end
      const e = RAMP_END[i]
      set(lrDots[i], { cx: lr.X(e.lr[0]), cy: lr.Y(e.lr[1]), r: S.dotRadius, stroke: colour(i), opacity: ringOn })
      set(lossDots[i], { cx: loss.X(e.loss[0]), cy: loss.Y(e.loss[1]), r: S.dotRadius, stroke: colour(i), opacity: ringOn })
    })
    set(noteRing, { cx: L.rampNote.x + 5, cy: L.rampNote.y - 4, r: S.dotRadius, opacity: T.rampEnds })
    set(noteText, { x: L.rampNote.x + 18, y: L.rampNote.y, opacity: T.rampEnds })

    // slide 3: the 40k run's log ends where its ramp does
    const [gx, gy] = LABEL_AT[GOOD]
    set(endText, { x: loss.X(gx) + L.label40k.dx, y: loss.Y(gy) + L.label40k.dy + 17, opacity: T.goodLabel })
  }

  // ---------- 10. control strip + playback: copy as-is ----------
  const bar = document.createElement('div')
  bar.className = 'scene-bar'
  const name = document.createElement('span')
  name.className = 'scene-name'
  name.innerHTML = '<span class="led" aria-hidden="true"></span>Fig. — Warmup length'
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

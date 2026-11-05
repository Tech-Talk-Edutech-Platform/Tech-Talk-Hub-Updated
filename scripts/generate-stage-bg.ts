// Generates public/stage-bg.svg: the line-art ridges behind the classroom's video room.
// Deterministic (seeded), so the file only changes when this script does.
// Run: bun run generate:stage-bg
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const W = 1600
const H = 900
const STROKE = '#f7b59f'

type Point = [x: number, y: number]
type Noise = (x: number, octaves?: number) => number
type Peak = { x: number; y: number; spread: number }

type MassifOptions = {
  seed: number
  from: number
  to: number
  peaks: Peak[]
  strands: number
  gap: number
  roughness: number
}

type WaterOptions = { seed: number; top: number; lines: number }

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Smoothstep easing between noise samples. */
const smooth = (t: number) => t * t * (3 - 2 * t)

/** 1D value noise with smooth interpolation, summed over octaves. */
function makeNoise(seed: number): Noise {
  const rand = mulberry32(seed)
  const table = Array.from({ length: 512 }, () => rand() * 2 - 1)
  const at = (i: number) => table[((i % 512) + 512) % 512]
  const value = (x: number) => {
    const i = Math.floor(x)
    const f = x - i
    return at(i) + (at(i + 1) - at(i)) * smooth(f)
  }
  return (x, octaves = 4) => {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (let o = 0; o < octaves; o++) {
      sum += value(x * freq) * amp
      norm += amp
      amp *= 0.5
      freq *= 2.1
    }
    return sum / norm
  }
}

/** A massif is a set of peaks; its ridge is the upper envelope of soft cones plus noise. */
function ridgeY(x: number, peaks: Peak[], noise: Noise, roughness: number) {
  let top = H + 40
  for (const p of peaks) {
    const d = Math.abs(x - p.x) / p.spread
    const y = p.y + (H - p.y) * Math.pow(Math.min(d, 1.6), 1.25)
    top = Math.min(top, y)
  }
  // Broad undulation plus a fine, jagged octave so slopes read as rock, not cones.
  return (
    top + noise(x / 120) * roughness + noise(x / 26 + 40, 3) * roughness * 0.45
  )
}

function polyline(points: Point[], opacity: number, width = 1) {
  const d = points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join('')
  return `<path d="${d}" stroke-opacity="${opacity.toFixed(2)}" stroke-width="${width}"/>`
}

function massif({
  seed,
  from,
  to,
  peaks,
  strands,
  gap,
  roughness,
}: MassifOptions) {
  const noise = makeNoise(seed)
  const strandNoise = makeNoise(seed + 7)
  const paths: string[] = []
  for (let s = 0; s < strands; s++) {
    const pts: Point[] = []
    for (let x = from; x <= to; x += 6) {
      const base = ridgeY(x, peaks, noise, roughness)
      // Strands fan out downhill and drift a little, like engraved contour lines.
      const y =
        base +
        s * gap * (1 + s * 0.06) +
        strandNoise(x / 60 + s * 3.1) * (2 + s * 0.9)
      if (y < H + 4) pts.push([x, y])
    }
    if (pts.length > 2) {
      const fade = s === 0 ? 0.55 : Math.max(0.1, 0.34 - s * 0.018)
      paths.push(polyline(pts, fade, s === 0 ? 1.4 : 1))
    }
  }
  return paths.join('')
}

function water({ seed, top, lines }: WaterOptions) {
  const noise = makeNoise(seed)
  const paths: string[] = []
  for (let i = 0; i < lines; i++) {
    const y0 = top + i * ((H - top) / lines)
    const pts: Point[] = []
    for (let x = 0; x <= W; x += 16) {
      pts.push([x, y0 + noise(x / 140 + i * 5.3) * 1.6])
    }
    paths.push(polyline(pts, 0.22 + (i % 3) * 0.08))
  }
  return paths.join('')
}

const layers = [
  massif({
    seed: 11,
    from: -20,
    to: 760,
    peaks: [
      { x: 120, y: 470, spread: 420 },
      { x: 360, y: 585, spread: 300 },
    ],
    strands: 18,
    gap: 7,
    roughness: 26,
  }),
  massif({
    seed: 29,
    from: 900,
    to: W + 20,
    peaks: [
      { x: 1520, y: 320, spread: 520 },
      { x: 1290, y: 500, spread: 300 },
    ],
    strands: 20,
    gap: 7,
    roughness: 30,
  }),
  massif({
    seed: 43,
    from: 1050,
    to: 1420,
    peaks: [{ x: 1230, y: 760, spread: 170 }],
    strands: 9,
    gap: 5,
    roughness: 10,
  }),
  water({ seed: 5, top: 838, lines: 11 }),
]

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${layers.join('')}</svg>\n`

const out = fileURLToPath(new URL('../public/stage-bg.svg', import.meta.url))
writeFileSync(out, svg)
process.stdout.write(`wrote ${out} (${(svg.length / 1024).toFixed(1)} KB)\n`)

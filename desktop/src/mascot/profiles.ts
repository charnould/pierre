/**
 * Formes et géométrie radiale adaptées de jeremy-prt/bloub (MIT).
 * https://github.com/jeremy-prt/bloub
 */

import type { MascotShape } from './look'

export const TAU = Math.PI * 2
export const PROFILE_SAMPLES = 64
/** Rayon du corps en unités viewBox. Diamètre 100 dans un viewBox 158. */
export const BODY_R = 50
export const MASCOT_VIEWBOX_SIZE = 158
export const MASCOT_VIEWBOX_MIN = -(MASCOT_VIEWBOX_SIZE / 2)
export const MASCOT_VIEWBOX = `${MASCOT_VIEWBOX_MIN} ${MASCOT_VIEWBOX_MIN} ${MASCOT_VIEWBOX_SIZE} ${MASCOT_VIEWBOX_SIZE}`
/** ViewBox calé sur le corps — slot avatar circulaire. */
const MASCOT_BODY_VIEWBOX_SIZE = BODY_R * 2
const MASCOT_BODY_VIEWBOX_MIN = -BODY_R
export const MASCOT_BODY_VIEWBOX = `${MASCOT_BODY_VIEWBOX_MIN} ${MASCOT_BODY_VIEWBOX_MIN} ${MASCOT_BODY_VIEWBOX_SIZE} ${MASCOT_BODY_VIEWBOX_SIZE}`

export type MascotFit = 'scene' | 'body'

export function mascotViewBox(fit: MascotFit = 'scene'): string {
  return fit === 'body' ? MASCOT_BODY_VIEWBOX : MASCOT_VIEWBOX
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const r2 = (v: number) => Math.round(v * 100) / 100

export function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Point = { x: number; y: number }

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * TAU)
const COS = ANGLES.map(Math.cos)
const SIN = ANGLES.map(Math.sin)

function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

function profileFromPolygon(poly: Point[], cx: number, cy: number): number[] {
  const radii = Array.from({ length: PROFILE_SAMPLES }, () => 0)
  const n = poly.length
  for (let k = 0; k < PROFILE_SAMPLES; k++) {
    const dx = COS[k] ?? 0
    const dy = SIN[k] ?? 0
    let best = 0
    for (let i = 0; i < n; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % n]!
      const ex = b.x - a.x
      const ey = b.y - a.y
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-9) continue
      const px = a.x - cx
      const py = a.y - cy
      const t = (px * ey - py * ex) / den
      const u = (px * dy - py * dx) / den
      if (t > best && u >= 0 && u <= 1) best = t
    }
    radii[k] = best
  }
  return radii
}

function hullOfCircles(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2v: number,
  steps = 96
): Point[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1e-6
  const base = Math.atan2(dy, dx)
  const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2v) / dist)))
  const pts: Point[] = []
  for (let i = 0; i <= steps / 2; i++) {
    const a = base + spread + ((TAU - 2 * spread) * i) / (steps / 2)
    pts.push({ x: x1 + Math.cos(a) * r1, y: y1 + Math.sin(a) * r1 })
  }
  for (let i = 0; i <= steps / 2; i++) {
    const a = base - spread + (2 * spread * i) / (steps / 2)
    pts.push({ x: x2 + Math.cos(a) * r2v, y: y2 + Math.sin(a) * r2v })
  }
  return pts
}

function superellipseProfile(n: number, sx = 1, sy = 1): number[] {
  return ANGLES.map((_, i) => {
    const c = Math.abs((COS[i] ?? 0) / sx) ** n
    const s = Math.abs((SIN[i] ?? 0) / sy) ** n
    return (c + s) ** (-1 / n)
  })
}

function unionOfCirclesProfile(circles: Array<{ x: number; y: number; r: number }>): number[] {
  const out = Array.from({ length: PROFILE_SAMPLES }, () => 0)
  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const dx = COS[i] ?? 0
    const dy = SIN[i] ?? 0
    let best = 0
    for (const c of circles) {
      const b = dx * c.x + dy * c.y
      const disc = b * b - (c.x * c.x + c.y * c.y - c.r * c.r)
      if (disc < 0) continue
      const t = b + Math.sqrt(disc)
      if (t > best) best = t
    }
    out[i] = best
  }
  return out
}

function roundedPolygon(verts: Point[], rc: number, arcSteps = 10): Point[] {
  const n = verts.length
  const out: Point[] = []
  const normal = (a: Point, b: Point) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    return Math.atan2(-dx / len, dy / len)
  }
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n]!
    const cur = verts[i]!
    const next = verts[(i + 1) % n]!
    const a0 = normal(prev, cur)
    const a1 = normal(cur, next)
    let d = a1 - a0
    while (d > Math.PI) d -= TAU
    while (d < -Math.PI) d += TAU
    for (let k = 0; k <= arcSteps; k++) {
      const a = a0 + (d * k) / arcSteps
      out.push({ x: cur.x + Math.cos(a) * rc, y: cur.y + Math.sin(a) * rc })
    }
  }
  return out
}

function regularPolygonProfile(
  sides: number,
  radius: number,
  rc: number,
  rotationDeg = 0
): number[] {
  const rot = (rotationDeg * Math.PI) / 180
  const verts = Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * TAU
    return { x: Math.cos(a) * (radius - rc), y: Math.sin(a) * (radius - rc) }
  })
  return profileFromPolygon(roundedPolygon(verts, rc), 0, 0)
}

const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02
)

const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
)

const droplet = normalize(
  profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
  1.04
)

const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0)

/** Catalogue identique à bloub `skins.ts` — mêmes constantes, mêmes ids. */
export const SHAPES: { id: MascotShape; radii: number[] }[] = [
  { id: 'cercle', radii: Array.from({ length: PROFILE_SAMPLES }, () => 1) },
  { id: 'galet', radii: pebble },
  { id: 'squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', radii: capsule },
  { id: 'triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  { id: 'hexagone', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'nuage', radii: cloud },
  { id: 'goutte', radii: droplet }
]

export const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]))

export function radiusAtAngle(radii: number[], angle: number): number {
  const n = radii.length
  const t = ((((angle / TAU) % 1) + 1) % 1) * n
  const i = Math.floor(t)
  return lerp(radii[i % n] ?? 1, radii[(i + 1) % n] ?? 1, t - i)
}

function toPoints(radii: number[], scale: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const r = radii[i] ?? 1
    out.push({ x: r * (COS[i] ?? 0) * scale, y: r * (SIN[i] ?? 0) * scale })
  }
  return out
}

function closedPath(pts: Point[], tension = 1 / 6): string {
  const n = pts.length
  if (n < 3) return ''
  const first = pts[0]!
  let d = `M${r2(first.x)} ${r2(first.y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % n]!
    const p3 = pts[(i + 2) % n]!
    const c1x = p1.x + (p2.x - p0.x) * tension
    const c1y = p1.y + (p2.y - p0.y) * tension
    const c2x = p2.x - (p3.x - p1.x) * tension
    const c2y = p2.y - (p3.y - p1.y) * tension
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`
  }
  return `${d}Z`
}

export function mascotRadii(shape: MascotShape): number[] {
  return SHAPE_BY_ID.get(shape)!.radii
}

export function mascotBodyPath(shape: MascotShape): string {
  return closedPath(toPoints(mascotRadii(shape), BODY_R))
}

export function capsulePath(w: number, h: number): string {
  const hw = Math.max(w, 0.01) / 2
  const hh = Math.max(h, 0.01) / 2
  const r = Math.min(hw, hh)
  return (
    `M${r2(-hw)} ${r2(-hh + r)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw + r)} ${r2(-hh)}` +
    `L${r2(hw - r)} ${r2(-hh)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw)} ${r2(-hh + r)}` +
    `L${r2(hw)} ${r2(hh - r)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw - r)} ${r2(hh)}` +
    `L${r2(-hw + r)} ${r2(hh)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw)} ${r2(hh - r)}Z`
  )
}

type Vec3 = [number, number, number]

export type HeadGaze = {
  yaw: number
  pitch: number
  roll: number
}

export type EyePose = {
  x: number
  y: number
  a: number
  b: number
  c: number
  d: number
  depth: number
}

const EYE_SPLIT = 15.46
export const REST_HEAD_GAZE: HeadGaze = { yaw: 28.49, pitch: 28.62, roll: -13 }

const deg = (d: number) => (d * Math.PI) / 180

function spin(u: Vec3, v: Vec3, angle: number): [Vec3, Vec3] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s],
    [v[0] * c - u[0] * s, v[1] * c - u[1] * s, v[2] * c - u[2] * s]
  ]
}

/** Yeux sur une sphère, projetés en orthographique. Extrait de bloub `face.ts`. */
export function eyePoses(gaze: HeadGaze, scale: number, split = EYE_SPLIT): [EyePose, EyePose] {
  let f: Vec3 = [0, 0, 1]
  let right: Vec3 = [1, 0, 0]
  let down: Vec3 = [0, 1, 0]
  ;[f, right] = spin(f, right, deg(gaze.yaw))
  ;[down, f] = spin(down, f, deg(gaze.pitch))
  ;[right, down] = spin(right, down, deg(gaze.roll))

  const build = (side: number): EyePose => {
    const [ef, er] = spin(f, right, deg(split * side))
    return {
      x: ef[0] * scale,
      y: ef[1] * scale,
      a: er[0],
      b: er[1],
      c: down[0],
      d: down[1],
      depth: ef[2]
    }
  }

  return [build(-1), build(1)]
}

export function blinkScale(lid: number): number {
  return 0.06 + 0.94 * clamp(lid)
}

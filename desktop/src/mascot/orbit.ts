/**
 * Anneaux d’orbit et pastille adaptés de jeremy-prt/bloub (MIT).
 * https://github.com/jeremy-prt/bloub
 */

import { BODY_R, clamp, createRng, r2, REST_HEAD_GAZE, TAU, type HeadGaze } from './profiles'

export const ORBIT_DURATION = 3.6
/** La pastille apparaît pendant l’extinction des anneaux. */
export const ORBIT_PASTILLE_AT = 2.5
/** Début du fondu OrbitFace → IdleFace. */
const ORBIT_FACE_BLEND_AT = 2.6
const ORBIT_FACE_BLEND_S = 0.7
export const PASTILLE_POP_S = 0.45

export const NOTIF_ANGLE = -42
export const NOTIF_DIST = 1.003
export const NOTIF_R = 0.15
export const NOTIF_POP = 1.14
export const NOTIF_MARGIN = 0.054

export type ArcRender = {
  id: string
  front: string
  back: string
  width: number
  opacity: number
  grad: { x1: number; y1: number; x2: number; y2: number; stops: string[] }
}

type ArcSeed = {
  a: number
  k: number
  tilt: number
  speed: number
  phase: number
  sweep: number
  hue: number
  hueSpan: number
  width: number
  cx: number
  cy: number
}

function wheel(hue: number, s = 0.55, l = 0.62): string {
  const h = ((hue % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function arcRender(seed: ArcSeed, t: number, scale: number, id: string, opacity = 1): ArcRender {
  const spin = seed.phase + t * seed.speed * TAU
  const cu = Math.cos(seed.tilt)
  const su = Math.sin(seed.tilt)
  const kz = Math.sqrt(Math.max(0, 1 - seed.k * seed.k))

  const n = 64
  const span = seed.sweep * TAU
  let front = ''
  let back = ''
  let prev: boolean | null = null

  for (let i = 0; i <= n; i++) {
    const th = spin + (i / n) * span
    const ct = Math.cos(th)
    const st = Math.sin(th)
    const x = seed.a * (ct * cu + st * -su * seed.k) + seed.cx
    const y = seed.a * (ct * su + st * cu * seed.k) + seed.cy
    const z = seed.a * st * kz
    const behind = z < 0
    const sx = r2(x * scale)
    const sy = r2(y * scale)
    const cmd = behind !== prev ? 'M' : 'L'
    if (behind) back += `${cmd}${sx} ${sy}`
    else front += `${cmd}${sx} ${sy}`
    prev = behind
  }

  const gx = Math.cos(seed.tilt) * seed.a * scale
  const gy = Math.sin(seed.tilt) * seed.a * scale
  return {
    id,
    front,
    back,
    width: seed.width * scale,
    opacity,
    grad: {
      x1: r2(seed.cx * scale - gx),
      y1: r2(seed.cy * scale - gy),
      x2: r2(seed.cx * scale + gx),
      y2: r2(seed.cy * scale + gy),
      stops: [wheel(seed.hue), wheel(seed.hue + seed.hueSpan * 0.5), wheel(seed.hue + seed.hueSpan)]
    }
  }
}

const RING_RNG = createRng(0xa11ce)

const RINGS: ArcSeed[] = Array.from({ length: 6 }, (_, i) => ({
  a: 1.3 + RING_RNG() * 0.1,
  k: 0.05 + RING_RNG() * 0.4,
  tilt: (i / 6) * Math.PI + RING_RNG() * 0.5,
  speed: 3 + RING_RNG() * 0.7,
  phase: RING_RNG() * TAU,
  sweep: 0.6 + RING_RNG() * 0.25,
  hue: (i * 360) / 6 + RING_RNG() * 30,
  hueSpan: 60 + RING_RNG() * 60,
  width: 0.05 + RING_RNG() * 0.012,
  cx: 0,
  cy: 0.1
}))

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

export function orbitArcs(t: number, scale = BODY_R): ArcRender[] {
  const fade = clamp(t / 0.8) * clamp((ORBIT_DURATION - t) / 0.9)
  return RINGS.map((s, i) =>
    arcRender(s, t, scale, `rg${i}`, fade * clamp((t - i * 0.13) / 0.3))
  ).filter((a) => a.opacity > 0.01)
}

/** 0 = visage orbit, 1 = idle. */
export function orbitIdleBlend(t: number): number {
  return clamp((t - ORBIT_FACE_BLEND_AT) / ORBIT_FACE_BLEND_S)
}

export function orbitGaze(t: number): HeadGaze & { eyeW: number; eyeH: number } {
  const back = easeInOutCubic(clamp((t - 1.6) / 0.9))
  return {
    yaw: REST_HEAD_GAZE.yaw + Math.sin(t * 6.5) * 65 * (1 - back),
    pitch: -4 + back * 32,
    roll: -13,
    eyeW: 0.21,
    eyeH: 0.4 + back * 0.07
  }
}

/** Échelle de pastille : 1 au repos, jusqu’à NOTIF_POP. `local` en secondes depuis le début du pop. */
export function pastillePopScale(local: number): number {
  const p = clamp(local / PASTILLE_POP_S)
  if (p >= 1) return 1
  return 1 + (NOTIF_POP - 1) * Math.sin(p * Math.PI) * (1 - p * 0.35)
}

export function shouldPlayOrbit(prevUnread: number, nextUnread: number): boolean {
  return nextUnread > prevUnread
}

export function shouldPlayPastillePop(prevUnread: number, nextUnread: number): boolean {
  return prevUnread > 0 && nextUnread > prevUnread
}

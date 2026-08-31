import { parseAvatarHex, type AvatarHex } from '../../../shared/avatar'
import { createRng } from './profiles'

export const MASCOT_SHAPES = [
  'cercle',
  'galet',
  'squircle',
  'capsule',
  'triangle',
  'hexagone',
  'nuage',
  'goutte'
] as const

export type MascotShape = (typeof MASCOT_SHAPES)[number]

export const DEFAULT_MASCOT_SHAPE: MascotShape = 'galet'

const LEGACY_SHAPES: Record<string, MascotShape> = {
  circle: 'cercle',
  square: 'squircle',
  blob: 'galet'
}

/** Bleu acier — lisible sur un bureau Windows clair ou sombre. */
export const DEFAULT_MASCOT_COLOR: AvatarHex = '#5a7eb5'

/** Corail — pastille non-lus, volontairement pop. */
export const DEFAULT_MASCOT_BADGE_COLOR: AvatarHex = '#ff6a45'

export type MascotColor = AvatarHex

export type MascotLook = {
  shape: MascotShape
  color: MascotColor
  badgeColor: MascotColor
}

/** Repos : visage un peu bas-gauche, dans le volume. */
export const MASCOT_REST_GAZE = { x: -0.34, y: 0.28 } as const

const SHAPE_SET = new Set<string>(MASCOT_SHAPES)

function isMascotShape(value: unknown): value is MascotShape {
  return typeof value === 'string' && SHAPE_SET.has(value)
}

export function parseMascotShape(value: unknown): MascotShape | undefined {
  if (typeof value !== 'string') return undefined
  if (isMascotShape(value)) return value
  return LEGACY_SHAPES[value]
}

export function parseMascotColor(value: unknown): MascotColor | undefined {
  const parsed = parseAvatarHex(typeof value === 'string' ? value.toLowerCase() : value)
  return parsed ?? undefined
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!
}

export function mascotLooksEqual(a: MascotLook, b: MascotLook): boolean {
  return a.shape === b.shape && a.color === b.color && a.badgeColor === b.badgeColor
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16)
  ]
}

function rgbToHex(r: number, g: number, b: number): MascotColor {
  const byte = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

function mixRgb(hex: string, toward: number, amount: number): MascotColor {
  const [r, g, b] = hexToRgb(hex)
  const t = clamp01(amount)
  return rgbToHex(r + (toward - r) * t, g + (toward - g) * t, b + (toward - b) * t)
}

/** Light stop of the body volume. */
export function lightenHex(hex: string, amount = 0.5): MascotColor {
  return mixRgb(parseMascotColor(hex) ?? DEFAULT_MASCOT_COLOR, 255, amount)
}

/** Dark stop of the body volume. */
export function darkenHex(hex: string, amount = 0.55): MascotColor {
  return mixRgb(parseMascotColor(hex) ?? DEFAULT_MASCOT_COLOR, 0, amount)
}

function hexToHsl(hex: string): [number, number, number] {
  const [r8, g8, b8] = hexToRgb(hex)
  const r = r8 / 255
  const g = g8 / 255
  const b = b8 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

/** Hue / sat / light shift around a picker hex. */
export function shiftHue(hex: string, dH: number, dS = 0, dL = 0): MascotColor {
  const parsed = parseMascotColor(hex) ?? DEFAULT_MASCOT_COLOR
  const [h, s, l] = hexToHsl(parsed)
  return hslToHex((((h + dH) % 360) + 360) % 360, clamp01(s + dS), clamp01(l + dL))
}

type PaintPool = { cx: number; cy: number; r: number; color: MascotColor; opacity: number }

export type MascotBodyPaint = {
  vol: {
    cx: number
    cy: number
    r: number
    lit: MascotColor
    wash: MascotColor
    mid: MascotColor
    blush: MascotColor
    dim: MascotColor
  }
  cool: PaintPool
  warm: PaintPool
  deep: PaintPool
  caustic: PaintPool
  sheen: PaintPool
  limb: PaintPool
  rim: { color: MascotColor; opacity: number }
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Volume + iridescence derived from one picker colour. Seeded, stable per hex. */
export function mascotBodyPaint(color: MascotColor): MascotBodyPaint {
  const hex = parseMascotColor(color) ?? DEFAULT_MASCOT_COLOR
  const rng = createRng(Number.parseInt(hex.slice(1), 16))
  const [, s] = hexToHsl(hex)
  const satBoost = s < 0.28 ? 0.34 - s : 0.14
  const wash = shiftHue(hex, -28 - rng() * 16, 0.12 + satBoost * 0.35, 0.12 + rng() * 0.05)
  const lit = lightenHex(wash, 0.28 + rng() * 0.08)

  return {
    vol: {
      cx: r2(-16 - rng() * 10),
      cy: r2(-20 - rng() * 10),
      r: r2(92 + rng() * 14),
      lit,
      wash,
      mid: hex,
      blush: shiftHue(hex, 32 + rng() * 28, 0.1 + satBoost * 0.4, 0.06 + rng() * 0.04),
      dim: shiftHue(hex, -12 + rng() * 10, 0.08 + satBoost * 0.2, -0.08 - rng() * 0.04)
    },
    cool: {
      cx: r2(22 + rng() * 10),
      cy: r2(2 + rng() * 12),
      r: r2(56 + rng() * 12),
      color: shiftHue(hex, -48 - rng() * 32, 0.16 + satBoost, 0.08 - rng() * 0.04),
      opacity: r2(0.5 + rng() * 0.1)
    },
    warm: {
      cx: r2(10 + rng() * 12),
      cy: r2(28 + rng() * 8),
      r: r2(48 + rng() * 10),
      color: shiftHue(hex, 42 + rng() * 40, 0.18 + satBoost, 0.1 + rng() * 0.04),
      opacity: r2(0.46 + rng() * 0.1)
    },
    deep: {
      cx: r2(-26 - rng() * 8),
      cy: r2(22 + rng() * 10),
      r: r2(52 + rng() * 10),
      color: shiftHue(hex, -82 - rng() * 28, 0.14 + satBoost, -0.06 - rng() * 0.04),
      opacity: r2(0.4 + rng() * 0.1)
    },
    caustic: {
      cx: r2(-14 - rng() * 8),
      cy: r2(-12 - rng() * 8),
      r: r2(32 + rng() * 8),
      color: shiftHue(hex, -58 - rng() * 18, 0.1 + satBoost, 0.14 + rng() * 0.05),
      opacity: r2(0.28 + rng() * 0.08)
    },
    sheen: {
      cx: r2(-14 - rng() * 8),
      cy: r2(-18 - rng() * 8),
      r: r2(44 + rng() * 8),
      color: lit,
      opacity: r2(0.28 + rng() * 0.08)
    },
    limb: {
      cx: r2(-40 - rng() * 8),
      cy: r2(-42 - rng() * 8),
      r: r2(54 + rng() * 8),
      color: lit,
      opacity: r2(0.3 + rng() * 0.08)
    },
    rim: {
      color: shiftHue(hex, -8 + rng() * 14, 0.16 + satBoost, -0.06 - rng() * 0.04),
      opacity: r2(0.32 + rng() * 0.08)
    }
  }
}

function hslToHex(h: number, s: number, l: number): MascotColor {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function randomSaturatedHex(random: () => number): MascotColor {
  return hslToHex(random() * 360, 0.48 + random() * 0.38, 0.4 + random() * 0.22)
}

/** Nouvelle forme + couleurs, distincte de `avoid` si le tirage le permet. */
export function randomMascotLook(
  avoid?: MascotLook,
  random: () => number = Math.random
): MascotLook {
  let next: MascotLook = {
    shape: DEFAULT_MASCOT_SHAPE,
    color: DEFAULT_MASCOT_COLOR,
    badgeColor: DEFAULT_MASCOT_BADGE_COLOR
  }
  for (let i = 0; i < 8; i++) {
    next = {
      shape: pick(MASCOT_SHAPES, random),
      color: randomSaturatedHex(random),
      badgeColor: randomSaturatedHex(random)
    }
    if (!avoid || !mascotLooksEqual(next, avoid)) return next
  }
  return next
}

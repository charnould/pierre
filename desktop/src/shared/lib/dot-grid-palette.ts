import { rgbTupleFromColor } from '@/shared/lib/canvas-color'

export interface DotGridPalette {
  idle: [number, number, number]
  ink: [number, number, number]
}

export function resolveDotGridPalette(): DotGridPalette {
  return {
    idle: rgbTupleFromColor('var(--dot-grid-ink-idle)'),
    ink: rgbTupleFromColor('var(--dot-grid-ink)')
  }
}

function lerpRgbTuple(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k)
  ]
}

export function heatToRgbString(palette: DotGridPalette, heat: number): string {
  const h = Math.max(0, Math.min(1, heat))
  return lerpRgbTuple(palette.idle, palette.ink, h).join(',')
}

export function sweepHeat(pos: number, target: number, width: number): number {
  const dist = Math.abs(pos - target)
  if (dist >= width) return 0
  const t = 1 - dist / width
  return t * t * (3 - 2 * t)
}

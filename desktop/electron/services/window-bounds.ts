import {
  DEFAULT_WINDOW_BOUNDS,
  parseWindowSettings,
  type WindowSettings
} from '../../src/shared/lib/ui-settings/schema'

export type WindowBounds = {
  width: number
  height: number
  x?: number
  y?: number
}

export function computeCenteredPosition(
  area: { x: number; y: number; width: number; height: number },
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2)
  }
}

export function parseWindowBoundsFromSettings(raw: Record<string, unknown>): WindowBounds | null {
  const parsed = parseWindowSettings(raw.window)
  if (!parsed?.width || !parsed?.height) return null

  const bounds: WindowBounds = {
    width: parsed.width,
    height: parsed.height
  }
  if (parsed.x !== undefined) bounds.x = parsed.x
  if (parsed.y !== undefined) bounds.y = parsed.y
  return bounds
}

export function resolveInitialWindowBounds(raw: Record<string, unknown>): WindowBounds {
  return parseWindowBoundsFromSettings(raw) ?? { ...DEFAULT_WINDOW_BOUNDS }
}

export function boundsToPartial(bounds: WindowBounds): Partial<WindowSettings> {
  const partial: Partial<WindowSettings> = {
    width: bounds.width,
    height: bounds.height
  }
  if (bounds.x !== undefined) partial.x = bounds.x
  if (bounds.y !== undefined) partial.y = bounds.y
  return partial
}

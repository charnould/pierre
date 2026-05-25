import { describe, expect, it } from 'bun:test'

import { DEFAULT_WINDOW_BOUNDS, WINDOW_MIN_SIZE } from '../../src/shared/lib/ui-settings/schema'
import {
  boundsToPartial,
  computeCenteredPosition,
  parseWindowBoundsFromSettings,
  resolveInitialWindowBounds
} from './window-bounds'

describe('parseWindowBoundsFromSettings', () => {
  it('returns null when width or height is missing', () => {
    expect(parseWindowBoundsFromSettings({ window: { width: 1200 } })).toBeNull()
    expect(parseWindowBoundsFromSettings({ window: { x: 10, y: 20 } })).toBeNull()
  })

  it('returns parsed bounds when width and height are present', () => {
    expect(
      parseWindowBoundsFromSettings({
        window: { width: 1280, height: 900, x: 120, y: 80 }
      })
    ).toEqual({
      width: 1280,
      height: 900,
      x: 120,
      y: 80
    })
  })

  it('clamps undersized dimensions', () => {
    expect(
      parseWindowBoundsFromSettings({
        window: { width: 100, height: 200 }
      })
    ).toEqual({
      width: WINDOW_MIN_SIZE.width,
      height: WINDOW_MIN_SIZE.height
    })
  })
})

describe('resolveInitialWindowBounds', () => {
  it('falls back to defaults when no window section exists', () => {
    expect(resolveInitialWindowBounds({})).toEqual({ ...DEFAULT_WINDOW_BOUNDS })
  })
})

describe('computeCenteredPosition', () => {
  it('centers the window within a work area', () => {
    expect(computeCenteredPosition({ x: 0, y: 25, width: 1440, height: 875 }, 1190, 840)).toEqual({
      x: 125,
      y: 43
    })
  })

  it('handles non-zero work area offsets', () => {
    expect(computeCenteredPosition({ x: 100, y: 50, width: 1200, height: 800 }, 1190, 840)).toEqual(
      {
        x: 105,
        y: 30
      }
    )
  })
})

describe('boundsToPartial', () => {
  it('maps bounds to a window settings patch', () => {
    expect(boundsToPartial({ width: 1280, height: 900, x: 10, y: 20 })).toEqual({
      width: 1280,
      height: 900,
      x: 10,
      y: 20
    })
  })
})

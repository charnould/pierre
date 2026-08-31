import { describe, expect, it } from 'bun:test'

import { easeOutCubic } from './ease-out-cubic'

describe('easeOutCubic', () => {
  it('maps the unit interval with a decelerating curve', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })
})

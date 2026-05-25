import { describe, expect, test } from 'bun:test'

import { colorToRgbComponents, neuronGridRgbaPrefix } from './neuron-grid-color'

describe('colorToRgbComponents', () => {
  test('parses 6-digit hex', () => {
    expect(colorToRgbComponents('#737373')).toBe('115,115,115')
  })

  test('parses 3-digit hex', () => {
    expect(colorToRgbComponents('#abc')).toBe('170,187,204')
  })

  test('falls back for garbage input', () => {
    expect(colorToRgbComponents('not-a-color')).toBe('0,0,238')
    expect(neuronGridRgbaPrefix('not-a-color')).toBe('rgba(0,0,238,')
    expect(neuronGridRgbaPrefix('not-a-color')).not.toContain('NaN')
  })

  test('neuronGridRgbaPrefix wraps components', () => {
    expect(neuronGridRgbaPrefix('#0000EE')).toBe('rgba(0,0,238,')
  })
})

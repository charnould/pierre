import { describe, expect, test } from 'bun:test'

import { colorToRgbComponents, rgbaPrefixFromColor, rgbTupleFromColor } from './canvas-color'

describe('colorToRgbComponents', () => {
  test('parses 6-digit hex', () => {
    expect(colorToRgbComponents('#737373')).toBe('115,115,115')
  })

  test('parses 3-digit hex', () => {
    expect(colorToRgbComponents('#abc')).toBe('170,187,204')
  })

  test('falls back for garbage input', () => {
    expect(colorToRgbComponents('not-a-color')).toBe('0,0,0')
    expect(rgbaPrefixFromColor('not-a-color')).toBe('rgba(0,0,0,')
    expect(rgbaPrefixFromColor('not-a-color')).not.toContain('NaN')
  })

  test('rgbaPrefixFromColor wraps components', () => {
    expect(rgbaPrefixFromColor('#0000EE')).toBe('rgba(0,0,238,')
  })

  test('rgbTupleFromColor returns numeric tuple', () => {
    expect(rgbTupleFromColor('#0000EE')).toEqual([0, 0, 238])
  })
})

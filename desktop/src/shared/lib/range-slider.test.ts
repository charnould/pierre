import { describe, expect, test } from 'bun:test'

import { formatNumericRangeLabel, normalizeNumericRange } from './range-slider'

describe('normalizeNumericRange', () => {
  test('sorts and clamps slider output', () => {
    expect(normalizeNumericRange([2020, 2015], 2000, 2029)).toEqual([2015, 2020])
    expect(normalizeNumericRange([1999, 2030], 2000, 2029)).toEqual([2000, 2029])
  })

  test('handles single-thumb values', () => {
    expect(normalizeNumericRange([2018], 2000, 2029)).toEqual([2018, 2018])
  })
})

describe('formatNumericRangeLabel', () => {
  test('collapses equal bounds', () => {
    expect(formatNumericRangeLabel(2015, 2015)).toBe('2015')
  })

  test('formats an inclusive range', () => {
    expect(formatNumericRangeLabel(2015, 2020)).toBe('2015 – 2020')
  })
})

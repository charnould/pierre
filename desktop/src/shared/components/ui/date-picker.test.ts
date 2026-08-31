import { describe, expect, test } from 'bun:test'

import { parseLocalIsoDate, toLocalIsoDate } from './date-picker'

describe('local ISO date helpers', () => {
  test('round-trip keeps the civil day at UTC midnight edges', () => {
    for (const iso of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      const parsed = parseLocalIsoDate(iso)
      expect(parsed).toBeDefined()
      expect(parsed!.getHours()).toBe(0)
      expect(toLocalIsoDate(parsed!)).toBe(iso)
    }
  })

  test('rejects impossible calendar dates', () => {
    expect(parseLocalIsoDate('2026-02-31')).toBeUndefined()
    expect(parseLocalIsoDate('2026-13-01')).toBeUndefined()
    expect(parseLocalIsoDate('not-a-date')).toBeUndefined()
    expect(parseLocalIsoDate('')).toBeUndefined()
  })

  test('never uses UTC when formatting a local Date', () => {
    const local = new Date(2026, 0, 1, 0, 0, 0)
    expect(toLocalIsoDate(local)).toBe('2026-01-01')
  })
})

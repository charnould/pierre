import { describe, expect, test } from 'bun:test'

import { formatDebutBailDisplay } from './format-debut-bail'

describe('formatDebutBailDisplay', () => {
  test('formats slash dates as DD/MM/YYYY', () => {
    expect(formatDebutBailDisplay('12/12/2026')).toBe('12/12/2026')
    expect(formatDebutBailDisplay('5/3/2024')).toBe('05/03/2024')
  })

  test('formats ISO dates as DD/MM/YYYY', () => {
    expect(formatDebutBailDisplay('2024-03-15')).toBe('15/03/2024')
  })

  test('returns null for missing values', () => {
    expect(formatDebutBailDisplay(null)).toBeNull()
    expect(formatDebutBailDisplay('')).toBeNull()
    expect(formatDebutBailDisplay('   ')).toBeNull()
  })
})

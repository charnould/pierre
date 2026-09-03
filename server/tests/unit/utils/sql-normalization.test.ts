import { describe, expect, it } from 'bun:test'

import { canonical_money_cents, chronological_date_key } from '../../../utils/sql-normalization'

describe('canonical_money_cents', () => {
  it('parses French decimals and usual grouping separators exactly to cents', () => {
    expect(canonical_money_cents('199,09')).toBe(19_909)
    expect(canonical_money_cents('1 234,56')).toBe(123_456)
    expect(canonical_money_cents('1\u00a0234,56')).toBe(123_456)
    expect(canonical_money_cents('1\u202f234,56')).toBe(123_456)
    expect(canonical_money_cents('1.234,56')).toBe(123_456)
    expect(canonical_money_cents("1'234.56")).toBe(123_456)
    expect(canonical_money_cents('-12,30')).toBe(-1_230)
  })

  it('rejects invalid and non-finite values', () => {
    for (const value of ['', '12 euros', '1,2,3', Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(canonical_money_cents(value)).toBeNull()
    }
  })
})

describe('chronological_date_key', () => {
  it('orders ISO and French dates on the same chronology', () => {
    expect(chronological_date_key('31/01/2030')).toBe(chronological_date_key('2030-01-31'))
    expect(
      chronological_date_key('01/02/2030').localeCompare(chronological_date_key('2030-01-31'))
    ).toBeGreaterThan(0)
    expect(
      chronological_date_key('2030-01-31T12:30:00Z').localeCompare(
        chronological_date_key('31/01/2030')
      )
    ).toBeGreaterThan(0)
  })

  it('puts invalid dates after valid ones with a deterministic key', () => {
    expect(chronological_date_key('not-a-date')).toBe('0:not-a-date')
    expect(chronological_date_key('31/02/2030')).toBe('0:31/02/2030')
    expect(
      chronological_date_key('not-a-date').localeCompare(chronological_date_key('2030-01-01'))
    ).toBeLessThan(0)
  })
})

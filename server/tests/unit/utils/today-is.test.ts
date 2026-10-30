import { describe, expect, it } from 'bun:test'

import { today_is } from '../../../utils/today-is'

const paris = 'Europe/Paris'

describe('today_is', () => {
  it('names Bastille Day with its ISO week', () => {
    expect(today_is(new Date('2025-07-14T07:30:00Z'), paris)).toBe(
      'Monday, July 14, 2025 (Week 29) at 09:30 – today is a French public holiday (Fête nationale)'
    )
  })

  it('keeps 1 January 2027 in ISO week 53', () => {
    expect(today_is(new Date('2026-12-31T23:30:00Z'), paris)).toBe(
      "Friday, January 01, 2027 (Week 53) at 00:30 – today is a French public holiday (Jour de l'an)"
    )
  })

  it('computes movable holidays after the old table', () => {
    expect(today_is(new Date('2028-04-17T07:30:00Z'), paris)).toContain('Lundi de Pâques')
    expect(today_is(new Date('2028-05-25T07:30:00Z'), paris)).toContain('Ascension')
    expect(today_is(new Date('2028-06-05T07:30:00Z'), paris)).toContain('Lundi de Pentecôte')
  })

  it('adds no holiday suffix on an ordinary day', () => {
    expect(today_is(new Date('2025-07-15T07:30:00Z'), paris)).toBe(
      'Tuesday, July 15, 2025 (Week 29) at 09:30'
    )
  })
})

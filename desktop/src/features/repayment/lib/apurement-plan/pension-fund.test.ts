import { describe, expect, test } from 'bun:test'

import {
  EMPLOYMENT_STATUS_ORDER,
  buildEmploymentSelectItems,
  decodeEmploymentSelectValue,
  employmentSelectLabel,
  employmentStatusNeedsPensionFund,
  encodeEmploymentSelectValue,
  PENSION_FUND_OPTIONS,
  type EmploymentStatus
} from './types'

describe('pension fund + employment status helpers', () => {
  test('PENSION_FUND_OPTIONS est trié alphanumériquement (fr)', () => {
    const sorted = [...PENSION_FUND_OPTIONS].sort((a, b) => a.localeCompare(b, 'fr'))
    expect([...PENSION_FUND_OPTIONS]).toEqual(sorted)
  })

  test('employmentStatusNeedsPensionFund couvre CDI/CDD/retraité uniquement', () => {
    const eligible: EmploymentStatus[] = [
      'permanent',
      'permanent_trial',
      'fixed_term',
      'fixed_term_trial',
      'retired'
    ]
    for (const status of eligible) {
      expect(employmentStatusNeedsPensionFund(status)).toBe(true)
    }
    expect(employmentStatusNeedsPensionFund('temporary')).toBe(false)
    expect(employmentStatusNeedsPensionFund('unemployed')).toBe(false)
  })

  test('EMPLOYMENT_STATUS_ORDER met sans emploi / intérim en tête', () => {
    expect(EMPLOYMENT_STATUS_ORDER.slice(0, 2)).toEqual(['unemployed', 'temporary'])
    expect(EMPLOYMENT_STATUS_ORDER.at(-2)).toBe('permanent_trial')
    expect(EMPLOYMENT_STATUS_ORDER.at(-1)).toBe('fixed_term_trial')
  })

  test('encode / decode statut sans caisse', () => {
    expect(encodeEmploymentSelectValue('unemployed', '')).toBe('unemployed')
    expect(encodeEmploymentSelectValue('temporary', 'CARSAT')).toBe('temporary')
    expect(decodeEmploymentSelectValue('unemployed')).toEqual({
      employmentStatus: 'unemployed',
      pensionFund: ''
    })
  })

  test('encode / decode statut + caisse', () => {
    expect(encodeEmploymentSelectValue('retired', '')).toBeNull()
    expect(encodeEmploymentSelectValue('retired', 'CARSAT')).toBe('retired::CARSAT')
    expect(decodeEmploymentSelectValue('retired::CARSAT')).toEqual({
      employmentStatus: 'retired',
      pensionFund: 'CARSAT'
    })
    expect(decodeEmploymentSelectValue('retired::INCONNU')).toBeNull()
    expect(decodeEmploymentSelectValue('permanent')).toBeNull()
  })

  test('employmentSelectLabel et items composites', () => {
    expect(employmentSelectLabel('unemployed', '')).toBe('Sans emploi')
    expect(employmentSelectLabel('retired', 'CARSAT')).toBe('Retraité · CARSAT')
    const items = buildEmploymentSelectItems()
    expect(items[0]).toEqual({ value: 'unemployed', label: 'Sans emploi' })
    expect(items.some((item) => item.value === 'retired::CARSAT')).toBe(true)
    expect(items).toHaveLength(2 + 5 * PENSION_FUND_OPTIONS.length)
  })
})

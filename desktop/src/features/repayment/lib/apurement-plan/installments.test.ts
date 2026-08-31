import { describe, expect, test } from 'bun:test'

import {
  addMonthsYearMonth,
  buildInstallments,
  firstInstallmentYearMonth,
  formatYearMonthDisplay,
  parseYearMonthInput,
  sumInstallments,
  typicalMonthlyAmount,
  updateInstallmentAmount,
  updateInstallmentYearMonth
} from './installments'

describe('installments', () => {
  test('addMonthsYearMonth crosses years', () => {
    expect(addMonthsYearMonth('2026-11', 1)).toBe('2026-12')
    expect(addMonthsYearMonth('2026-12', 1)).toBe('2027-01')
    expect(addMonthsYearMonth('2026-01', 24)).toBe('2028-01')
  })

  test('formatYearMonthDisplay', () => {
    expect(formatYearMonthDisplay('2026-08')).toBe('08/2026')
  })

  test('parseYearMonthInput accepts MM/YYYY', () => {
    expect(parseYearMonthInput('08/2026')).toBe('2026-08')
    expect(parseYearMonthInput('8/2026')).toBe('2026-08')
    expect(parseYearMonthInput('13/2026')).toBeNull()
    expect(parseYearMonthInput('abc')).toBeNull()
  })

  test('firstInstallmentYearMonth: month after today without moratorium', () => {
    expect(
      firstInstallmentYearMonth(
        { banqueDeFranceStatus: 'none', moratoriumEndDate: '' },
        new Date('2026-07-29T12:00:00')
      )
    ).toBe('2026-08')
  })

  test('firstInstallmentYearMonth: month after moratorium end', () => {
    expect(
      firstInstallmentYearMonth(
        {
          banqueDeFranceStatus: 'moratorium',
          moratoriumEndDate: '2026-03-15'
        },
        new Date('2026-01-01T12:00:00')
      )
    ).toBe('2026-04')
  })

  test('firstInstallmentYearMonth: moratorium without date → month after today', () => {
    expect(
      firstInstallmentYearMonth(
        { banqueDeFranceStatus: 'moratorium', moratoriumEndDate: '' },
        new Date('2026-07-29T12:00:00')
      )
    ).toBe('2026-08')
  })

  test('buildInstallments splits debt with remainder on last', () => {
    const installments = buildInstallments({
      debt: 1000,
      count: 3,
      firstYearMonth: '2026-08'
    })
    expect(installments).toHaveLength(3)
    expect(installments.map((e) => e.yearMonth)).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(installments[0].amount).toBe(333.33)
    expect(installments[1].amount).toBe(333.33)
    expect(installments[2].amount).toBe(333.34)
    expect(sumInstallments(installments)).toBeCloseTo(1000)
  })

  test('buildInstallments reuses existing ids', () => {
    const first = buildInstallments({ debt: 100, count: 2, firstYearMonth: '2026-08' })
    const second = buildInstallments({
      debt: 200,
      count: 2,
      firstYearMonth: '2026-08',
      existing: first
    })
    expect(second[0].id).toBe(first[0].id)
    expect(second[1].id).toBe(first[1].id)
    expect(second[0].amount).toBe(100)
  })

  test('buildInstallments covers debt over 24 months', () => {
    const installments = buildInstallments({
      debt: 1234.56,
      count: 24,
      firstYearMonth: '2026-08'
    })
    expect(installments).toHaveLength(24)
    expect(sumInstallments(installments)).toBeCloseTo(1234.56)
    expect(installments[23].yearMonth).toBe('2028-07')
  })

  test('buildInstallments accepts more than 24 months', () => {
    const installments = buildInstallments({
      debt: 4800,
      count: 48,
      firstYearMonth: '2026-08'
    })
    expect(installments).toHaveLength(48)
    expect(sumInstallments(installments)).toBeCloseTo(4800)
  })

  test('typicalMonthlyAmount uses first installment', () => {
    const installments = buildInstallments({ debt: 1000, count: 3, firstYearMonth: '2026-08' })
    expect(typicalMonthlyAmount(installments)).toBe(333.33)
  })

  test('updateInstallmentAmount redistributes remaining debt', () => {
    const base = buildInstallments({ debt: 1000, count: 4, firstYearMonth: '2026-08' })
    const next = updateInstallmentAmount(base, 0, 400, 1000)
    expect(next[0].amount).toBe(400)
    expect(next[1].amount).toBe(200)
    expect(next[2].amount).toBe(200)
    expect(next[3].amount).toBe(200)
    expect(sumInstallments(next)).toBeCloseTo(1000)
    expect(next[0].id).toBe(base[0].id)
  })

  test('updateInstallmentYearMonth cascades following months', () => {
    const base = buildInstallments({ debt: 300, count: 3, firstYearMonth: '2026-08' })
    const next = updateInstallmentYearMonth(base, 1, '2027-01')
    expect(next.map((e) => e.yearMonth)).toEqual(['2026-08', '2027-01', '2027-02'])
  })
})

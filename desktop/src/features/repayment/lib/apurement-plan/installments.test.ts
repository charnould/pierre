import { describe, expect, test } from 'bun:test'

import {
  addMonths,
  buildInstallments,
  firstInstallmentDate,
  formatInstallmentDate,
  formatMonthDisplay,
  parseMonthInput,
  parseInstallmentDate,
  sumInstallments,
  typicalMonthlyAmount,
  updateInstallmentAmount,
  updateInstallmentDate
} from './installments'

describe('installments', () => {
  test('addMonths keeps the day and clamps short months', () => {
    expect(addMonths('2026-11-05', 1)).toBe('2026-12-05')
    expect(addMonths('2026-12-05', 1)).toBe('2027-01-05')
    expect(addMonths('2026-01-05', 24)).toBe('2028-01-05')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
  })

  test('formatInstallmentDate', () => {
    expect(formatInstallmentDate('2026-08-01')).toBe('01/08/2026')
  })

  test('parseInstallmentDate accepts DD/MM/YYYY', () => {
    expect(parseInstallmentDate('01/08/2026')).toBe('2026-08-01')
    expect(parseInstallmentDate('1/8/2026')).toBe('2026-08-01')
    expect(parseInstallmentDate('31/02/2026')).toBe('2026-02-28')
    expect(parseInstallmentDate('32/01/2026')).toBeNull()
    expect(parseInstallmentDate('08/2026')).toBeNull()
    expect(parseInstallmentDate('abc')).toBeNull()
    expect(parseMonthInput('08/2026')).toBe('2026-08')
    expect(parseMonthInput('8/2026')).toBe('2026-08')
    expect(parseMonthInput('13/2026')).toBeNull()
    expect(formatMonthDisplay('2026-08')).toBe('08/2026')
  })

  test('firstInstallmentDate: month after today without moratorium', () => {
    expect(
      firstInstallmentDate(
        { banqueDeFranceStatus: 'none', moratoriumEndDate: '' },
        new Date('2026-07-29T12:00:00')
      )
    ).toBe('2026-08-01')
  })

  test('firstInstallmentDate: month after moratorium end', () => {
    expect(
      firstInstallmentDate(
        {
          banqueDeFranceStatus: 'moratorium',
          moratoriumEndDate: '2026-03-15'
        },
        new Date('2026-01-01T12:00:00')
      )
    ).toBe('2026-04-01')
  })

  test('firstInstallmentDate: moratorium without date → month after today', () => {
    expect(
      firstInstallmentDate(
        { banqueDeFranceStatus: 'moratorium', moratoriumEndDate: '' },
        new Date('2026-07-29T12:00:00')
      )
    ).toBe('2026-08-01')
  })

  test('buildInstallments splits debt with remainder on last', () => {
    const installments = buildInstallments({
      debt: 1000,
      count: 3,
      firstDate: '2026-08-01'
    })
    expect(installments).toHaveLength(3)
    expect(installments.map((e) => e.date)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01'])
    expect(installments[0].amount).toBe(333.33)
    expect(installments[1].amount).toBe(333.33)
    expect(installments[2].amount).toBe(333.34)
    expect(sumInstallments(installments)).toBeCloseTo(1000)
  })

  test('buildInstallments reuses existing ids', () => {
    const first = buildInstallments({ debt: 100, count: 2, firstDate: '2026-08-01' })
    const second = buildInstallments({
      debt: 200,
      count: 2,
      firstDate: '2026-08-01',
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
      firstDate: '2026-08-01'
    })
    expect(installments).toHaveLength(24)
    expect(sumInstallments(installments)).toBeCloseTo(1234.56)
    expect(installments[23].date).toBe('2028-07-01')
  })

  test('buildInstallments plafonne à 36 mensualités', () => {
    const installments = buildInstallments({
      debt: 4800,
      count: 48,
      firstDate: '2026-08-01'
    })
    expect(installments).toHaveLength(36)
    expect(sumInstallments(installments)).toBeCloseTo(4800)
    expect(buildInstallments({ debt: 3600, count: 36, firstDate: '2026-08-01' })).toHaveLength(36)
  })

  test('typicalMonthlyAmount uses first installment', () => {
    const installments = buildInstallments({ debt: 1000, count: 3, firstDate: '2026-08-01' })
    expect(typicalMonthlyAmount(installments)).toBe(333.33)
  })

  test('updateInstallmentAmount redistributes remaining debt', () => {
    const base = buildInstallments({ debt: 1000, count: 4, firstDate: '2026-08-01' })
    const next = updateInstallmentAmount(base, 0, 400, 1000)
    expect(next[0].amount).toBe(400)
    expect(next[1].amount).toBe(200)
    expect(next[2].amount).toBe(200)
    expect(next[3].amount).toBe(200)
    expect(sumInstallments(next)).toBeCloseTo(1000)
    expect(next[0].id).toBe(base[0].id)
  })

  test('updateInstallmentDate cascades following months', () => {
    const base = buildInstallments({ debt: 300, count: 3, firstDate: '2026-08-01' })
    const next = updateInstallmentDate(base, 1, '2027-01-31')
    expect(next.map((e) => e.date)).toEqual(['2026-08-01', '2027-01-31', '2027-02-28'])
  })
})

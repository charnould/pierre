import { describe, expect, test } from 'bun:test'

import { computeApurementPlanCalculations, computeConsumptionUnits } from './calculations'
import {
  buildApurementPlanOutput,
  createAdultMember,
  createAmountLine,
  createChildMember,
  createDefaultApurementPlanForm
} from './defaults'
import { buildInstallments } from './installments'
import { parseMoneyInput } from './money'

describe('apurement-plan calculations', () => {
  test('default form exposes signed false and persists it in output', () => {
    const form = createDefaultApurementPlanForm()
    expect(form.signed).toBe(false)
    expect(buildApurementPlanOutput('LOC-1', { ...form, signed: true }).form.signed).toBe(true)
  })

  test('computeConsumptionUnits applies INSEE formula by age', () => {
    const ref = new Date('2026-07-28T12:00:00')

    expect(computeConsumptionUnits({ adults: [createAdultMember()], children: [] }, ref)).toBe(1)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember(), createAdultMember({ isLeaseHolder: false })],
          children: [createChildMember({ birthDate: '2015-01-01' })]
        },
        ref
      )
    ).toBeCloseTo(1.8)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [
            createChildMember({ birthDate: '2011-01-01' }),
            createChildMember({ birthDate: '2016-06-01' })
          ]
        },
        ref
      )
    ).toBeCloseTo(1.8)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [createChildMember({ birthDate: '' })]
        },
        ref
      )
    ).toBeCloseTo(1.3)
  })

  test('sums all expenses including total rent', () => {
    const form = createDefaultApurementPlanForm()
    form.expenses = [
      createAmountLine({ label: 'Loyer total', amount: 500, custom: false }),
      createAmountLine({ label: 'Mutuelle santé', amount: 50, custom: false })
    ]
    form.income = [
      createAmountLine({ label: 'Salaire(s) net(s)', amount: 1500, custom: false }),
      createAmountLine({ label: 'APL / ALF / ALS (tiers payant)', amount: 200, custom: false })
    ]

    const calc = computeApurementPlanCalculations(form)
    expect(calc.totalExpenses).toBe(550)
    expect(calc.disposableIncome).toBe(1150)
  })

  test('computes plan total from installments', () => {
    const form = createDefaultApurementPlanForm()
    form.rentalDebt = 1200
    form.installments = buildInstallments({
      debt: 1200,
      count: 12,
      firstYearMonth: '2026-08'
    })

    const calc = computeApurementPlanCalculations(form)
    expect(calc.planTotal).toBeCloseTo(1200)
  })

  test('returns null plan total without installments', () => {
    const form = createDefaultApurementPlanForm()
    form.rentalDebt = 1000
    form.installments = []

    const calc = computeApurementPlanCalculations(form)
    expect(calc.planTotal).toBeNull()
  })

  test('counts CU from children ages', () => {
    const form = createDefaultApurementPlanForm()
    form.household.adults = [
      { ...createAdultMember(), id: 'a1' },
      { ...createAdultMember({ isLeaseHolder: false }), id: 'a2' }
    ]
    form.household.children = [
      { ...createChildMember({ birthDate: '2015-01-01', isDependent: true }), id: 'e1' },
      { ...createChildMember({ birthDate: '2018-01-01', isDependent: false }), id: 'e2' }
    ]

    const calc = computeApurementPlanCalculations(form)
    expect(calc.consumptionUnits).toBeCloseTo(2.1)
  })
})

describe('parseMoneyInput', () => {
  test('parses comma and spaces', () => {
    expect(parseMoneyInput('1 234,56')).toBeCloseTo(1234.56)
    expect(parseMoneyInput('')).toBe(0)
  })
})

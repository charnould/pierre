import { beforeAll, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { amountPerUnit, computeConsumptionUnits, computeInstallmentBudget } from './calculations'
import {
  createAdultMember,
  createAmountLine,
  createChildMember,
  createDefaultRepaymentPlanForm
} from './defaults'
import { dailyAmount } from './money'
import { parseMoneyInput } from './money'

describe('apurement-plan calculations', () => {
  beforeAll(() => {
    loadCustomizationFixture()
  })

  test('default form is unsigned', () => {
    expect(createDefaultRepaymentPlanForm().signed).toBe(false)
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

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [createChildMember({ birthDate: '2026-08-01' })]
        },
        ref
      )
    ).toBe(1)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [
            createChildMember({ birthDate: '2026-09-01' }),
            createChildMember({ birthDate: '2026-09-01' })
          ]
        },
        new Date('2026-09-01T12:00:00')
      )
    ).toBeCloseTo(1.6)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [createChildMember({ birthDate: '2012-07-29' })]
        },
        ref
      )
    ).toBeCloseTo(1.3)

    expect(
      computeConsumptionUnits(
        {
          adults: [createAdultMember()],
          children: [createChildMember({ birthDate: '2012-07-28' })]
        },
        ref
      )
    ).toBeCloseTo(1.5)
  })

  test('rattache une ponctuelle au mois de l’échéance et ignore un enfant pas encore né', () => {
    const form = createDefaultRepaymentPlanForm()
    form.household.children = [createChildMember({ birthDate: '2026-09-01' })]
    form.income = [
      createAmountLine({ label: 'Salaire(s) net(s)', amount: 1500, custom: false }),
      createAmountLine({
        label: 'Prime exceptionnelle',
        amount: 200,
        custom: false,
        month: '2026-08'
      })
    ]
    form.expenses = [
      createAmountLine({ label: 'Loyer + Charges - Aide au logement', amount: 500, custom: false }),
      createAmountLine({ label: 'Impôt', amount: 50, custom: true, month: '2026-09' })
    ]

    const august = computeInstallmentBudget(form, '2026-08-05', 0)
    expect(august.recurringIncome).toBe(1500)
    expect(august.punctualIncome).toBe(200)
    expect(august.punctualExpenses).toBe(0)
    expect(august.disposableIncome).toBe(1200)
    expect(august.simplifiedDisposableIncome).toBe(1200)
    expect(august.effortRate).toBeCloseTo(500 / 1700)
    expect(august.consumptionUnits).toBe(1)

    const september = computeInstallmentBudget(form, '2026-09-01', 0)
    expect(september.punctualIncome).toBe(0)
    expect(september.punctualExpenses).toBe(50)
    expect(september.disposableIncome).toBe(950)
    expect(september.simplifiedDisposableIncome).toBe(1000)
    expect(september.consumptionUnits).toBeCloseTo(1.3)
    expect(amountPerUnit(september.disposableIncome, september.consumptionUnits)).toBeCloseTo(
      950 / 1.3
    )
    expect(
      dailyAmount(amountPerUnit(september.disposableIncome, september.consumptionUnits))
    ).toBeCloseTo(950 / 1.3 / 30)
    expect(
      amountPerUnit(september.simplifiedDisposableIncome, september.consumptionUnits)
    ).toBeCloseTo(1000 / 1.3)
  })

  test('un crédit en cours s’arrête au mois de fin', () => {
    const form = createDefaultRepaymentPlanForm()
    form.expenses = [
      createAmountLine({ label: 'Loyer + Charges - Aide au logement', amount: 500, custom: false }),
      createAmountLine({ label: 'Crédit en cours', amount: 80, custom: false, endMonth: '2026-08' })
    ]
    expect(computeInstallmentBudget(form, '2026-08-05', 0).recurringExpenses).toBe(580)
    expect(computeInstallmentBudget(form, '2026-09-01', 0).recurringExpenses).toBe(500)
    form.income = [createAmountLine({ label: 'Salaire(s) net(s)', amount: 1500, custom: false })]
    const withPayment = computeInstallmentBudget(form, '2026-08-05', 100)
    expect(withPayment.effortRate).toBeCloseTo(680 / 1500)
    expect(withPayment.simplifiedEffortRate).toBeCloseTo(600 / 1500)
    expect(withPayment.disposableIncome).toBe(1500 - 680)
    expect(withPayment.simplifiedDisposableIncome).toBe(1500 - 600)
  })

  test('effort rates are absent when the household has no income', () => {
    const form = createDefaultRepaymentPlanForm()
    form.income = []
    form.expenses = [
      createAmountLine({ label: 'Loyer + Charges - Aide au logement', amount: 500, custom: false })
    ]
    const month = computeInstallmentBudget(form, '2026-08-01', 0)
    expect(month.effortRate).toBeNull()
    expect(month.simplifiedEffortRate).toBeNull()
    expect(month.simplifiedDisposableIncome).toBe(-500)
  })

  test('counts CU from children ages', () => {
    const form = createDefaultRepaymentPlanForm()
    form.household.adults = [
      { ...createAdultMember(), id: 'a1' },
      { ...createAdultMember({ isLeaseHolder: false }), id: 'a2' }
    ]
    form.household.children = [
      { ...createChildMember({ birthDate: '2015-01-01', isDependent: true }), id: 'e1' },
      { ...createChildMember({ birthDate: '2018-01-01', isDependent: false }), id: 'e2' }
    ]

    expect(computeConsumptionUnits(form.household, new Date('2026-08-01T12:00:00'))).toBeCloseTo(
      2.1
    )
  })
})

describe('parseMoneyInput', () => {
  test('parses comma and spaces', () => {
    expect(parseMoneyInput('1 234,56')).toBeCloseTo(1234.56)
    expect(parseMoneyInput('')).toBe(0)
  })
})

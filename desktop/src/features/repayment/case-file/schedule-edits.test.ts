import { describe, expect, test } from 'bun:test'

import {
  blankInstallment,
  blankSchedule,
  emptyRepaymentCaseFile
} from '@pierre/shared/repayment-case-file'

import {
  applyInstallmentEdit,
  createInitialSchedule,
  firstOfNextMonth,
  installmentAmounts,
  netRentAlert,
  rebalanceScheduleIfDebtChanged
} from './schedule-edits'

describe('installmentAmounts', () => {
  test('laisse les centimes restants sur la dernière échéance', () => {
    const amounts = installmentAmounts(100.01, 3)
    expect(amounts).toEqual([33.33, 33.33, 33.35])
    expect(amounts.reduce((sum: number, value) => sum + (value ?? 0), 0)).toBeCloseTo(100.01)
  })

  test('reste vide sans dette', () => {
    expect(installmentAmounts(null, 3)).toEqual([null, null, null])
    expect(installmentAmounts(0, 2)).toEqual([null, null])
  })
})

describe('échéancier', () => {
  const today = new Date(2026, 9, 27)
  const row = (date: string | null, amount: number | null = null) => blankInstallment(date, amount)

  test('un plan neuf commence le 1er du mois suivant', () => {
    expect(firstOfNextMonth(today)).toBe('2026-11-01')
    const created = applyInstallmentEdit(90, [], [row(null), row(null), row(null)], today)
    expect(created.map((item) => item.date_echeance)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01'
    ])
    expect(created.map((item) => item.montant_en_euros)).toEqual([30, 30, 30])
  })

  test('un jour saisi est recopié sur toutes les échéances', () => {
    const previous = [row('2026-11-01'), row('2026-12-01'), row('2027-01-01')]
    const next = [row('2026-11-01'), row('2026-12-09'), row('2027-01-01')]
    expect(
      applyInstallmentEdit(90, previous, next, today).map((item) => item.date_echeance)
    ).toEqual(['2026-11-09', '2026-12-09', '2027-01-09'])
  })

  test('un 31 est ramené au dernier jour de février', () => {
    const previous = [row('2026-01-01'), row('2026-02-01')]
    const next = [row('2026-01-31'), row('2026-02-01')]
    expect(
      applyInstallmentEdit(10, previous, next, today).map((item) => item.date_echeance)
    ).toEqual(['2026-01-31', '2026-02-28'])
  })

  test('ajouter ou retirer recale la série sur le mois suivant, au jour choisi', () => {
    const previous = [row('2027-03-09'), row('2027-04-09'), row('2027-05-09')]
    const added = applyInstallmentEdit(100, previous, [...previous, row(null)], today)
    expect(added.map((item) => item.date_echeance)).toEqual([
      '2026-11-09',
      '2026-12-09',
      '2027-01-09',
      '2027-02-09'
    ])
    const removed = applyInstallmentEdit(100, previous, [previous[0]!, previous[2]!], today)
    expect(removed.map((item) => item.date_echeance)).toEqual(['2026-11-09', '2026-12-09'])
    expect(removed.map((item) => item.montant_en_euros)).toEqual([50, 50])
  })

  test('une mensualité saisie recalcule seulement les suivantes', () => {
    const previous = [25, 25, 25, 25].map((amount) => row('2026-11-01', amount))
    const next = previous.map((item, index) =>
      index === 1 ? { ...item, montant_en_euros: 10 } : item
    )
    expect(
      applyInstallmentEdit(100, previous, next, today).map((item) => item.montant_en_euros)
    ).toEqual([25, 10, 32.5, 32.5])
  })
})

describe('netRentAlert', () => {
  test('le loyer net est en alerte seulement quand les deux seuils sont franchis', () => {
    expect(netRentAlert(0.25, 50, 35, 15)).toBe(false)
    expect(netRentAlert(0.36, 10, 35, 15)).toBe(true)
    expect(netRentAlert(0.36, 15, 35, 15)).toBe(false)
    expect(netRentAlert(0.35, 10, 35, 15)).toBe(false)
    expect(netRentAlert(null, 10, 35, 15)).toBe(false)
  })
})

describe('dette de l’échéancier', () => {
  test('répartit à nouveau les mensualités quand la dette change', () => {
    const before = emptyRepaymentCaseFile().donnees_communes
    before.compte_locataire.solde_compte_en_euros = 90
    const after = {
      ...before,
      compte_locataire: { ...before.compte_locataire, solde_compte_en_euros: 30 }
    }
    const schedule = {
      ...blankSchedule(),
      echeances: [
        blankInstallment('2026-11-01', 30),
        blankInstallment('2026-12-01', 30),
        blankInstallment('2027-01-01', 30)
      ]
    }
    expect(
      rebalanceScheduleIfDebtChanged(before, after, schedule)?.echeances.map(
        (row) => row.montant_en_euros
      )
    ).toEqual([10, 10, 10])
    expect(rebalanceScheduleIfDebtChanged(before, before, schedule)).toBe(schedule)
  })

  test('un échéancier initial commence le mois suivant', () => {
    const common = emptyRepaymentCaseFile().donnees_communes
    common.compte_locataire.solde_compte_en_euros = 90
    const created = createInitialSchedule(common, 3, new Date(2026, 9, 27))
    expect(created.montant_a_apurer_en_euros).toBe(90)
    expect(created.echeances.map((row) => row.date_echeance)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01'
    ])
    expect(created.echeances.map((row) => row.montant_en_euros)).toEqual([30, 30, 30])
  })
})

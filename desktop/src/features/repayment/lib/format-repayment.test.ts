import { describe, expect, test } from 'bun:test'

import {
  formatDebtRentRatioMonths,
  formatDebtRentRatioMonthsOneDecimal,
  formatDaysSinceLastAction,
  formatRepaymentDateIso,
  quantizeDebtRentRatioMonths
} from './format-repayment'

describe('formatRepaymentDateIso', () => {
  test('retourne YYYY-MM-DD en calendrier local', () => {
    expect(formatRepaymentDateIso('2026-06-15T14:30:00')).toBe('2026-06-15')
    expect(formatRepaymentDateIso('2026-06-11 11:00')).toBe('2026-06-11')
    expect(formatRepaymentDateIso('15/06/2026')).toBe('2026-06-15')
  })

  test('retourne une chaîne vide si date invalide', () => {
    expect(formatRepaymentDateIso('invalid')).toBe('')
  })
})

describe('debt rent ratio months', () => {
  test('quantize arrondit au demi-mois le plus proche', () => {
    expect(quantizeDebtRentRatioMonths(2.24)).toBe(2)
    expect(quantizeDebtRentRatioMonths(2.25)).toBe(2.5)
    expect(quantizeDebtRentRatioMonths(2.74)).toBe(2.5)
    expect(quantizeDebtRentRatioMonths(2.75)).toBe(3)
    expect(quantizeDebtRentRatioMonths(3)).toBe(3)
  })

  test('format affiche ∼ avec entier ou ,5 uniquement', () => {
    expect(formatDebtRentRatioMonths(2.24)).toBe('∼ 2 mois')
    expect(formatDebtRentRatioMonths(2.74)).toBe('∼ 2,5 mois')
    expect(formatDebtRentRatioMonths(3)).toBe('∼ 3 mois')
  })

  test('format fiche dossier — une décimale, libellé mois', () => {
    expect(formatDebtRentRatioMonthsOneDecimal(4.58)).toBe('4,6 mois')
    expect(formatDebtRentRatioMonthsOneDecimal(2)).toBe('2,0 mois')
    expect(formatDebtRentRatioMonthsOneDecimal(0)).toBe('—')
  })
})

describe('formatDaysSinceLastAction', () => {
  test('formate le délai depuis la dernière action', () => {
    expect(formatDaysSinceLastAction(0)).toBe("Aujourd'hui")
    expect(formatDaysSinceLastAction(1)).toBe('1 jour')
    expect(formatDaysSinceLastAction(17)).toBe('17 jours')
  })
})

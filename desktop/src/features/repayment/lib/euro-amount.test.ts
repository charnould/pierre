import { describe, expect, test } from 'bun:test'

import { isSettledBalance, roundToCents } from './euro-amount'

describe('roundToCents', () => {
  test('efface la dérive flottante d’un cumul de loyers', () => {
    expect(roundToCents(199.09 + 645.97)).toBe(845.06)
    expect(roundToCents(199.09 + 645.97 - 845.06)).toBe(0)
  })

  test('conserve les montants au centime', () => {
    expect(roundToCents(845.06)).toBe(845.06)
    expect(roundToCents(-120.5)).toBe(-120.5)
    expect(roundToCents(0.01)).toBe(0.01)
  })

  test('ramène -0 à 0 pour ne pas afficher « -0,00 € »', () => {
    expect(roundToCents(-0.0001)).toBe(0)
    expect(Object.is(roundToCents(-0.0001), -0)).toBe(false)
  })
})

describe('isSettledBalance', () => {
  test('considère soldé le résidu flottant d’un paiement intégral', () => {
    // 199,09 + 645,97 − 845,06 vaut exactement 0 € en décimal.
    expect(isSettledBalance(199.09 + 645.97 - 845.06)).toBe(true)
    expect(isSettledBalance(0)).toBe(true)
  })

  test('considère soldé un solde créditeur', () => {
    expect(isSettledBalance(-50)).toBe(true)
  })

  test('ne solde pas une dette d’un centime', () => {
    expect(isSettledBalance(0.01)).toBe(false)
    expect(isSettledBalance(845.06)).toBe(false)
  })
})

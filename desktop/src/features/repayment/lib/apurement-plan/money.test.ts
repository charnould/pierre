import { describe, expect, test } from 'bun:test'

import { formatMoneyInput, parseMoneyInput } from './money'

describe('parseMoneyInput', () => {
  test('lit le séparateur de milliers espace et la décimale virgule', () => {
    expect(parseMoneyInput('1 234,56')).toBe(1234.56)
    expect(parseMoneyInput('1 234')).toBe(1234)
  })

  test('lit les espaces insécables, quel que soit leur codet', () => {
    // U+202F est l'espace émise par `Intl.NumberFormat('fr-FR')`.
    expect(parseMoneyInput('1\u202F234,56')).toBe(1234.56)
    expect(parseMoneyInput('1\u00A0234,56')).toBe(1234.56)
  })

  test('lit la décimale point', () => {
    expect(parseMoneyInput('1234.56')).toBe(1234.56)
  })

  test('lit le séparateur de milliers point à la française', () => {
    // Régression : `'1.234,56'` devenait `'1.234.56'`, donc NaN, donc 0 €.
    expect(parseMoneyInput('1.234,56')).toBe(1234.56)
    expect(parseMoneyInput('1.234.567,89')).toBe(1234567.89)
  })

  test('lit le séparateur de milliers virgule à l’anglaise', () => {
    expect(parseMoneyInput('1,234.56')).toBe(1234.56)
  })

  test('tolère un symbole monétaire collé au montant', () => {
    expect(parseMoneyInput('845,06 €')).toBe(845.06)
  })

  test('lit un montant négatif', () => {
    expect(parseMoneyInput('-100,50')).toBe(-100.5)
  })

  test('relit ce que formatMoneyInput a écrit', () => {
    for (const value of [1234.56, 1234567.89, 845.06, 0.05, 12]) {
      expect(parseMoneyInput(formatMoneyInput(value))).toBe(value)
    }
  })

  test('interprète un point seul comme une décimale, comme à l’import', () => {
    // `'1.234'` est ambigu ; sans virgule, le point est décimal.
    expect(parseMoneyInput('1.234')).toBe(1.234)
  })

  test('renvoie 0 sur une saisie vide', () => {
    expect(parseMoneyInput('')).toBe(0)
    expect(parseMoneyInput('   ')).toBe(0)
  })

  test('renvoie 0 sur une saisie non numérique, sans la tronquer', () => {
    // Le 0 est indistinguable d'un champ vide : ambiguïté connue et conservée,
    // changer la signature toucherait les composants de formulaire.
    expect(parseMoneyInput('abc')).toBe(0)
    expect(parseMoneyInput('12,34,56')).toBe(0)
    expect(parseMoneyInput('1 234,56 par mois')).toBe(0)
    expect(parseMoneyInput('1e3')).toBe(0)
  })
})

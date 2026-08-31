import { describe, expect, test } from 'bun:test'

import { compareLedgerDatesAsc, compareLedgerDatesDesc, parseLedgerDate } from './ledger-date'

/** Repère lisible `YYYY-MM-DD` en heure locale, sans repasser par un fuseau. */
function localIsoDay(date: Date | null): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('parseLedgerDate', () => {
  test('lit une date à barres obliques en jour/mois/année', () => {
    // Le cœur du correctif : `new Date('05/01/2024')` renvoie le 1er mai.
    expect(localIsoDay(parseLedgerDate('05/01/2024'))).toBe('2024-01-05')
    expect(parseLedgerDate('05/01/2024')?.getMonth()).toBe(0)
    expect(parseLedgerDate('05/01/2024')?.getDate()).toBe(5)
  })

  test('lit un jour supérieur à 12, où les deux conventions divergent sans ambiguïté', () => {
    // 28 ne peut pas être un mois : la lecture jour/mois est la seule possible.
    expect(localIsoDay(parseLedgerDate('28/02/2024'))).toBe('2024-02-28')
    // 13/01 serait le 13e mois à l'américaine ; `new Date` y voit le 13 janvier.
    expect(localIsoDay(parseLedgerDate('13/01/2024'))).toBe('2024-01-13')
    expect(localIsoDay(parseLedgerDate('25/12/2023'))).toBe('2023-12-25')
  })

  test('accepte le format non complété D/M/YYYY', () => {
    expect(localIsoDay(parseLedgerDate('5/1/2024'))).toBe('2024-01-05')
    expect(localIsoDay(parseLedgerDate('31/1/2024'))).toBe('2024-01-31')
  })

  test('accepte une heure accolée à la date à barres obliques', () => {
    const parsed = parseLedgerDate('28/02/2024 14:30')
    expect(localIsoDay(parsed)).toBe('2024-02-28')
    expect(parsed?.getHours()).toBe(14)
    expect(parsed?.getMinutes()).toBe(30)
  })

  test('lit une date ISO seule dans le fuseau local', () => {
    expect(localIsoDay(parseLedgerDate('2024-01-05'))).toBe('2024-01-05')
    expect(parseLedgerDate('2024-01-05')?.getHours()).toBe(0)
  })

  test('lit un horodatage ISO complet en conservant l’heure', () => {
    const parsed = parseLedgerDate('2026-06-05T09:00:00')
    expect(localIsoDay(parsed)).toBe('2026-06-05')
    expect(parsed?.getHours()).toBe(9)
  })

  test('accepte l’horodatage ISO minuscule produit à l’import', () => {
    expect(localIsoDay(parseLedgerDate('2026-06-05t09:00:00'))).toBe('2026-06-05')
  })

  test('rejette les dates impossibles plutôt que de les décaler', () => {
    // `new Date(2024, 0, 32)` basculerait au 1er février ; on préfère `null`.
    expect(parseLedgerDate('32/01/2024')).toBeNull()
    expect(parseLedgerDate('30/02/2024')).toBeNull()
    expect(parseLedgerDate('05/13/2024')).toBeNull()
    expect(parseLedgerDate('2024-02-30')).toBeNull()
  })

  test('accepte le 29 février d’une année bissextile', () => {
    expect(localIsoDay(parseLedgerDate('29/02/2024'))).toBe('2024-02-29')
    expect(parseLedgerDate('29/02/2023')).toBeNull()
  })

  test('renvoie null sur une entrée vide, absente ou illisible', () => {
    expect(parseLedgerDate('')).toBeNull()
    expect(parseLedgerDate('   ')).toBeNull()
    expect(parseLedgerDate(null)).toBeNull()
    expect(parseLedgerDate(undefined)).toBeNull()
    expect(parseLedgerDate(42)).toBeNull()
    expect(parseLedgerDate('invalid')).toBeNull()
  })
})

describe('compareLedgerDatesAsc', () => {
  test('ordonne les dates à barres obliques chronologiquement', () => {
    const dates = ['10/03/2024', '05/01/2024', '28/02/2024']
    expect([...dates].sort(compareLedgerDatesAsc)).toEqual([
      '05/01/2024',
      '28/02/2024',
      '10/03/2024'
    ])
  })

  test('ordonne ensemble les formats ISO et à barres obliques', () => {
    const dates = ['28/02/2024', '2024-01-10', '05/01/2024']
    expect([...dates].sort(compareLedgerDatesAsc)).toEqual([
      '05/01/2024',
      '2024-01-10',
      '28/02/2024'
    ])
  })

  test('renvoie les dates illisibles en fin de liste', () => {
    expect(['', '28/02/2024', 'invalid', '05/01/2024'].sort(compareLedgerDatesAsc)).toEqual([
      '05/01/2024',
      '28/02/2024',
      '',
      'invalid'
    ])
    expect(compareLedgerDatesAsc('invalid', 'autre')).toBe(0)
  })
})

describe('compareLedgerDatesDesc', () => {
  test('ordonne du plus récent au plus ancien', () => {
    const dates = ['05/01/2024', '10/03/2024', '28/02/2024']
    expect([...dates].sort(compareLedgerDatesDesc)).toEqual([
      '10/03/2024',
      '28/02/2024',
      '05/01/2024'
    ])
  })

  test('garde les dates illisibles en fin de liste', () => {
    expect(['invalid', '10/03/2024', '05/01/2024'].sort(compareLedgerDatesDesc)).toEqual([
      '10/03/2024',
      '05/01/2024',
      'invalid'
    ])
  })
})

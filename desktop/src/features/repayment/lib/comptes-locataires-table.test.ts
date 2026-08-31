import { describe, expect, test } from 'bun:test'

import { COMPTES_LOCATAIRES_TABLE, isComptesLocatairesMissing } from './comptes-locataires-table'

describe('isComptesLocatairesMissing', () => {
  test('returns false when tables are unknown (null/undefined)', () => {
    expect(isComptesLocatairesMissing(null)).toBe(false)
    expect(isComptesLocatairesMissing(undefined)).toBe(false)
  })

  test('returns false when the table is not listed', () => {
    expect(isComptesLocatairesMissing([])).toBe(false)
    expect(isComptesLocatairesMissing([{ name: 'reclamations', exists: false }])).toBe(false)
  })

  test('returns false when comptes_locataires exists', () => {
    expect(isComptesLocatairesMissing([{ name: COMPTES_LOCATAIRES_TABLE, exists: true }])).toBe(
      false
    )
  })

  test('returns true when comptes_locataires is explicitly absent', () => {
    expect(
      isComptesLocatairesMissing([
        { name: 'reclamations', exists: true },
        { name: COMPTES_LOCATAIRES_TABLE, exists: false }
      ])
    ).toBe(true)
  })
})

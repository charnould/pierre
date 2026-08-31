import { describe, expect, test } from 'bun:test'

import { sanitizeColumnSorting } from './repayment-column-sort'

describe('repayment-column-sort', () => {
  test('sanitizeColumnSorting conserve au plus un critère valide', () => {
    expect(
      sanitizeColumnSorting([
        { id: 'id_site', desc: false },
        { id: 'invalid', desc: true },
        { id: 'solde_locataire', desc: true }
      ])
    ).toEqual([{ id: 'id_site', desc: false }])
  })

  test('sanitizeColumnSorting ignore evolution_solde', () => {
    expect(sanitizeColumnSorting([{ id: 'evolution_solde', desc: true }])).toEqual([])
    expect(sanitizeColumnSorting([{ id: 'categorie', desc: true }])).toEqual([
      { id: 'categorie', desc: true }
    ])
  })
})

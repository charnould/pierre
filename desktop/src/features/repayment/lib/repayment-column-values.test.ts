import { describe, expect, test } from 'bun:test'

import { getRepaymentBucketMeta } from './repayment-bucket'
import {
  cellValueForColumn,
  collectDistinctColumnValues,
  isRepaymentColorizableColumn
} from './repayment-column-values'
import { sampleRepaymentRow } from './repayment-test-fixtures'

describe('repayment-column-values', () => {
  const rows = [
    sampleRepaymentRow({ id_locataire: 'LOC-1', id_site: 'SITE-A', statut: 'client' }),
    sampleRepaymentRow({ id_locataire: 'LOC-2', id_site: 'SITE-B', statut: 'ex-client' })
  ]

  test('isRepaymentColorizableColumn identifie les colonnes discrètes', () => {
    expect(isRepaymentColorizableColumn('id_site')).toBe(true)
    expect(isRepaymentColorizableColumn('gestionnaire')).toBe(true)
    expect(isRepaymentColorizableColumn('ratio_dette_loyer')).toBe(true)
    expect(isRepaymentColorizableColumn('solde_locataire')).toBe(false)
    expect(isRepaymentColorizableColumn('date_derniere_action_realisee')).toBe(false)
  })

  test('cellValueForColumn formate le ratio dette/loyer', () => {
    const row = sampleRepaymentRow({ ratio_dette_loyer: 2.5 })
    expect(cellValueForColumn('ratio_dette_loyer', row)).toBe('∼ 2,5 mois')
  })

  test('cellValueForColumn résout le libellé gestionnaire', () => {
    const row = sampleRepaymentRow({ gestionnaire: 'ghost@exemple.fr' } as never)
    expect(cellValueForColumn('gestionnaire', row)).toBe('ghost@exemple.fr')
  })

  test('collectDistinctColumnValues agrège les ids uniques', () => {
    const values = collectDistinctColumnValues('id_site', rows)
    expect(values.sort()).toEqual(['SITE-A', 'SITE-B'])
  })

  test('statut affiche la valeur brute', () => {
    expect(cellValueForColumn('statut', rows[0]!)).toBe('client')
  })

  test('collectDistinctColumnValues résout les libellés de phase', () => {
    const row = rows[0]!
    const values = collectDistinctColumnValues('bucket', [row], {
      getBucket: () => 'amiable'
    })
    expect(values).toEqual([getRepaymentBucketMeta('amiable').label])
  })
})

import { describe, expect, test } from 'bun:test'

import {
  DEFAULT_REPAYMENT_COLUMN_SIZING,
  defaultRepaymentColumnSizing,
  isRepaymentColumnId,
  isRepaymentNumericColumn,
  isRepaymentUiColumnId,
  ledgerColumnIdsFromMeta,
  LOCKED_REPAYMENT_COLUMN_IDS,
  pinLockedRepaymentColumns,
  resolveRepaymentTableColumnIds
} from './repayment-table-columns'

describe('repayment-table-columns', () => {
  test('isRepaymentUiColumnId valide les colonnes UI', () => {
    expect(isRepaymentUiColumnId('bucket')).toBe(true)
    expect(isRepaymentUiColumnId('categorie')).toBe(false)
  })

  test('isRepaymentNumericColumn cible les montants et ratios', () => {
    expect(isRepaymentNumericColumn('solde_locataire')).toBe(true)
    expect(isRepaymentNumericColumn('ratio_dette_loyer')).toBe(true)
    expect(isRepaymentNumericColumn('montant_en_euros')).toBe(true)
    expect(isRepaymentNumericColumn('id_client')).toBe(false)
  })

  test('isRepaymentColumnId accepte les champs ledger dynamiques', () => {
    const ledger = ['id_client', 'categorie', 'ratio_dette_loyer']
    expect(isRepaymentColumnId('categorie', ledger)).toBe(true)
    expect(isRepaymentColumnId('inconnu', ledger)).toBe(false)
  })

  test('ledgerColumnIdsFromMeta reprend meta.columns tel quel', () => {
    expect(
      ledgerColumnIdsFromMeta([
        { name: 'id_client', type: 'TEXT' },
        { name: 'categorie', type: 'TEXT' }
      ])
    ).toEqual(['id_client', 'categorie'])
  })

  test('pinLockedRepaymentColumns place les colonnes verrouillées en tête', () => {
    expect(pinLockedRepaymentColumns(['id_site', 'bucket', 'id_locataire'])).toEqual([
      'alertes',
      'id_site',
      'bucket',
      'id_locataire'
    ])
  })

  test('resolveRepaymentTableColumnIds fusionne UI et ledger sans colonnes always-hidden', () => {
    expect(
      resolveRepaymentTableColumnIds(['id_client', 'statut', 'categorie', 'evolution_solde'])
    ).toEqual([
      'alertes',
      'derniere_action_realisee',
      'date_derniere_action_realisee',
      'id_client',
      'categorie'
    ])
  })

  test('colonnes verrouillées restent verrouillées', () => {
    expect([...LOCKED_REPAYMENT_COLUMN_IDS]).toEqual(['alertes'])
  })

  test('defaultRepaymentColumnSizing donne 160 px à gestionnaire', () => {
    expect(DEFAULT_REPAYMENT_COLUMN_SIZING.gestionnaire).toBe(160)
    expect(defaultRepaymentColumnSizing(['gestionnaire']).gestionnaire).toBe(160)
  })
})

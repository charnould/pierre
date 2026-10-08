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
  resolveRepaymentColumnLabel,
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
      'selection',
      'alertes',
      'id_site',
      'bucket',
      'id_locataire'
    ])
  })

  test('resolveRepaymentTableColumnIds place les colonnes métier avant le reste du ledger', () => {
    expect(
      resolveRepaymentTableColumnIds([
        'categorie',
        'telephone_status',
        'id_client',
        'statut',
        'solde_locataire',
        'id_locataire',
        'gestionnaire',
        'email_status',
        'ratio_dette_loyer',
        'evolution_solde'
      ])
    ).toEqual([
      'selection',
      'alertes',
      'id_locataire',
      'id_client',
      'solde_locataire',
      'ratio_dette_loyer',
      'email_status',
      'telephone_status',
      'gestionnaire',
      'derniere_action_realisee',
      'date_derniere_action_realisee',
      'categorie'
    ])
  })

  test('resolveRepaymentColumnLabel expose des libellés métier et humanise le reste', () => {
    expect(resolveRepaymentColumnLabel('solde_locataire')).toBe('Dette')
    expect(resolveRepaymentColumnLabel('ratio_dette_loyer')).toBe('Dette / loyer')
    expect(resolveRepaymentColumnLabel('id_site')).toBe('Site')
    expect(resolveRepaymentColumnLabel('champ_personnalise')).toBe('Champ personnalise')
  })

  test('colonnes verrouillées restent verrouillées', () => {
    expect([...LOCKED_REPAYMENT_COLUMN_IDS]).toEqual(['selection', 'alertes'])
  })

  test('defaultRepaymentColumnSizing donne 160 px à gestionnaire', () => {
    expect(DEFAULT_REPAYMENT_COLUMN_SIZING.gestionnaire).toBe(160)
    expect(defaultRepaymentColumnSizing(['gestionnaire']).gestionnaire).toBe(160)
  })
})

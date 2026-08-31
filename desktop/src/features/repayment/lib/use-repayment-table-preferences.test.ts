import { describe, expect, test } from 'bun:test'

import { resolveTablePrefs } from './use-repayment-table-preferences'

describe('repayment table preferences', () => {
  test('préférences table résolues (visibilité colonnes)', () => {
    const ledgerColumns = ['id_client', 'solde_locataire', 'categorie', 'ratio_dette_loyer']
    const prefs = resolveTablePrefs(
      {
        columnVisibility: { id_client: true, categorie: true, ratio_dette_loyer: true }
      },
      ledgerColumns
    )

    expect(prefs.columnVisibility.id_client).toBe(true)
    expect(prefs.columnVisibility.ratio_dette_loyer).toBe(true)
    expect(prefs.columnVisibility.categorie).toBe(true)
  })

  test('colonne alertes reste toujours visible', () => {
    const prefs = resolveTablePrefs(
      {
        columnVisibility: { alertes: false }
      },
      ['id_client']
    )

    expect(prefs.columnVisibility.alertes).toBe(true)
    expect(prefs.columnVisibility.bucket).toBeUndefined()
  })

  test('colonnes verrouillées restent en tête d’ordre', () => {
    const prefs = resolveTablePrefs({ columnOrder: ['id_client', 'bucket', 'categorie'] }, [
      'id_client',
      'categorie'
    ])

    expect(prefs.columnOrder[0]).toBe('alertes')
    expect(prefs.columnOrder).not.toContain('bucket')
  })

  test('defaultColumnVisibility inclut les colonnes ledger dynamiques', () => {
    const ledger = ['id_client', 'categorie', 'ratio_dette_loyer']
    const visibility = resolveTablePrefs(undefined, ledger).columnVisibility
    expect(visibility.ratio_dette_loyer).toBe(true)
    expect(visibility.categorie).toBe(true)
    expect(visibility.evolution_solde).toBeUndefined()
  })

  test('evolution_solde persisté est retiré des colonnes actives', () => {
    const prefs = resolveTablePrefs(
      {
        columnVisibility: { evolution_solde: true },
        columnOrder: ['evolution_solde', 'id_client']
      },
      ['id_client', 'evolution_solde']
    )
    expect(prefs.columnOrder).not.toContain('evolution_solde')
    expect(prefs.columnVisibility.evolution_solde).toBeUndefined()
  })

  test('statut ledger est exclu des colonnes actives', () => {
    const prefs = resolveTablePrefs(undefined, ['id_client', 'statut', 'categorie'])
    expect(prefs.columnOrder).not.toContain('statut')
    expect(prefs.columnVisibility.statut).toBeUndefined()
  })
})

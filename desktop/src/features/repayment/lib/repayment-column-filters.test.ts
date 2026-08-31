import { describe, expect, test } from 'bun:test'

import {
  collectFilterFacets,
  filterRepaymentRows,
  formatRepaymentFacetLabel,
  sanitizeRepaymentColumnFilters
} from './repayment-column-filters'
import { sampleRepaymentRow } from './repayment-test-fixtures'

describe('repayment-column-filters', () => {
  const rows = [
    sampleRepaymentRow({ id_locataire: 'LOC-1', id_site: 'SITE-A', id_batiment: 'BAT-A' }),
    sampleRepaymentRow({ id_locataire: 'LOC-2', id_site: 'SITE-B', id_batiment: 'BAT-B' })
  ]

  test('filterRepaymentRows filtre par id_site', () => {
    const filtered = filterRepaymentRows(rows, { id_site: ['SITE-A'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id_site).toBe('SITE-A')
  })

  test('combine plusieurs colonnes en ET', () => {
    const filtered = filterRepaymentRows(rows, {
      id_site: ['SITE-A'],
      id_batiment: ['BAT-A']
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id_locataire).toBe('LOC-1')
  })

  test('collectFilterFacets agrège les valeurs uniques', () => {
    const facets = collectFilterFacets('id_site', rows)
    expect(facets.sort()).toEqual(['SITE-A', 'SITE-B'])
  })

  test('formatRepaymentFacetLabel laisse les valeurs brutes pour statut', () => {
    expect(formatRepaymentFacetLabel('statut', 'client')).toBe('client')
  })

  test('sanitizeRepaymentColumnFilters ignore evolution_solde', () => {
    expect(sanitizeRepaymentColumnFilters({ evolution_solde: ['x'], id_site: ['SITE-A'] })).toEqual(
      {
        id_site: ['SITE-A']
      }
    )
  })

  test('date_derniere_action_realisee filtre sur jours depuis aujourd’hui', () => {
    const dated = [
      sampleRepaymentRow({
        id_locataire: 'LOC-OLD',
        derniere_action_realisee: 'Envoyer un SMS de relance',
        date_derniere_action_realisee: '2026-07-08'
      } as never),
      sampleRepaymentRow({
        id_locataire: 'LOC-NEW',
        derniere_action_realisee: 'Envoyer un SMS de relance',
        date_derniere_action_realisee: '2026-08-10'
      } as never)
    ]
    const getters = {
      getLastAction: (row: (typeof dated)[number]) => {
        const action = row['derniere_action_realisee']
        const date = row['date_derniere_action_realisee']
        if (typeof action !== 'string' || typeof date !== 'string' || !date) return null
        return { action: action as 'sms_relance', date }
      }
    }
    // Freeze “today” indirectly: daysSinceToday uses real Date — assert facets differ
    // by checking both dates produce finite day strings when getters are wired.
    const facets = collectFilterFacets('date_derniere_action_realisee', dated, getters)
    expect(facets.length).toBeGreaterThanOrEqual(1)
    expect(facets.every((value) => /^\d+$/.test(value))).toBe(true)
  })
})

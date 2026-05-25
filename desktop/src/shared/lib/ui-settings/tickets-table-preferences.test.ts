import { describe, expect, it } from 'bun:test'

import {
  buildHiddenColumnsPatch,
  preferencesToPatch,
  reconcilePinnedWithHidden,
  ticketsTablePreferencesReducer
} from './tickets-table-preferences'

describe('reconcilePinnedWithHidden', () => {
  it('removes hidden columns from pinned set', () => {
    const { pinnedColumns, pinnedChanged } = reconcilePinnedWithHidden(
      ['id_locataire'],
      ['id_reclamation', 'id_locataire']
    )
    expect(pinnedColumns).toEqual(['id_reclamation'])
    expect(pinnedChanged).toBe(true)
  })
})

describe('buildHiddenColumnsPatch', () => {
  it('includes pinnedColumns in patch only when reconciliation changed pins', () => {
    expect(buildHiddenColumnsPatch(['motif'], ['id_reclamation'])).toEqual({
      hiddenColumns: ['motif']
    })

    expect(buildHiddenColumnsPatch(['motif'], ['id_reclamation', 'motif'])).toEqual({
      hiddenColumns: ['motif'],
      pinnedColumns: ['id_reclamation']
    })
  })
})

describe('preferencesToPatch', () => {
  it('maps reducer state to undefined for empty collections', () => {
    expect(
      preferencesToPatch({
        columnOrder: [],
        columnFilters: {},
        hiddenColumns: [],
        pinnedColumns: undefined,
        columnWidths: {}
      })
    ).toEqual({
      columnOrder: undefined,
      columnFilters: undefined,
      hiddenColumns: undefined,
      pinnedColumns: undefined,
      columnWidths: undefined
    })
  })
})

describe('ticketsTablePreferencesReducer', () => {
  it('sync_from_settings hydrates state from persisted settings', () => {
    const state = ticketsTablePreferencesReducer(
      {
        columnOrder: [],
        columnFilters: {},
        hiddenColumns: [],
        pinnedColumns: undefined,
        columnWidths: {}
      },
      {
        type: 'sync_from_settings',
        settings: {
          columnOrder: ['motif'],
          hiddenColumns: ['id_lot'],
          columnFilters: { motif: ['fuite'] }
        }
      }
    )

    expect(state.columnOrder).toEqual(['motif'])
    expect(state.hiddenColumns).toEqual(['id_lot'])
    expect(state.columnFilters).toEqual({ motif: ['fuite'] })
  })

  it('set_hidden reconciles pinned columns in state', () => {
    const state = ticketsTablePreferencesReducer(
      {
        columnOrder: [],
        columnFilters: {},
        hiddenColumns: [],
        pinnedColumns: ['id_reclamation', 'id_locataire'],
        columnWidths: {}
      },
      { type: 'set_hidden', hiddenColumns: ['id_locataire'] }
    )

    expect(state.hiddenColumns).toEqual(['id_locataire'])
    expect(state.pinnedColumns).toEqual(['id_reclamation'])
  })
})

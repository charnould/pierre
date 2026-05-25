import { describe, expect, it } from 'bun:test'

import { mergeTicketsTablePatches } from './merge-table-patches'

describe('mergeTicketsTablePatches', () => {
  it('merges distinct keys from rapid edits', () => {
    const merged = mergeTicketsTablePatches(
      { hiddenColumns: ['motif'] },
      { columnWidths: { motif: 240 } }
    )

    expect(merged).toEqual({
      hiddenColumns: ['motif'],
      columnWidths: { motif: 240 }
    })
  })

  it('lets later partials override the same key', () => {
    const merged = mergeTicketsTablePatches(
      { hiddenColumns: ['motif'] },
      { hiddenColumns: ['id_lot'] }
    )

    expect(merged.hiddenColumns).toEqual(['id_lot'])
  })
})

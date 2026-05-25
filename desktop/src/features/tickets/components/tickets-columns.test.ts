import { describe, expect, it } from 'bun:test'

import { getTicketId } from '@/shared/lib/ticket-row'
import { resolveTicketColumnLabel } from '@/shared/lib/ui-settings/schema'
import {
  DEFAULT_PINNED_COLUMNS,
  TICKET_TABLE_DRAFT_GROUP_ID,
  columnVisibilityToHiddenColumns,
  hiddenColumnsToColumnVisibility,
  mergeFullColumnOrder,
  resolveColumnOrder,
  resolvePinnedColumns,
  resolveUnpinnedColumnOrder,
  resolveVisibleColumnNames
} from '@/shared/lib/ui-settings/tickets-table'
import type { TicketsColumnMeta } from '@/shared/types'

import { buildTicketsColumns } from './tickets-columns'

const schema: TicketsColumnMeta[] = [
  { name: 'motif', type: 'TEXT' },
  { name: 'id_reclamation', type: 'TEXT' },
  { name: 'type_affaire', type: 'TEXT' },
  { name: 'id_locataire', type: 'TEXT' },
  { name: 'id_lot', type: 'TEXT' }
]

const schemaNames = schema.map((c) => c.name)

describe('buildTicketsColumns', () => {
  it('defines all schema columns for TanStack visibility and order', () => {
    const columns = buildTicketsColumns(schema)
    expect(columns.map((c) => c.accessorKey)).toEqual(schemaNames)
    expect(DEFAULT_PINNED_COLUMNS).toEqual(['id_reclamation', 'id_locataire', 'id_lot'])
    const idCol = columns.find((c) => c.accessorKey === 'id_reclamation')
    expect(idCol?.enablePinning).toBe(true)
    expect(idCol?.enableHiding).toBe(true)
    expect(idCol?.size).toBe(160)
    expect(resolveTicketColumnLabel('type_affaire')).toBe('type_affaire')
    expect(
      resolveTicketColumnLabel('motif', {
        tickets: { table: { columnLabels: { motif: 'Motif' } } }
      })
    ).toBe('Motif')
    expect(typeof columns.find((c) => c.accessorKey === 'id_lot')?.header).toBe('function')
  })

  it('prepends draft NPIR group column when onDraftIconClick is set', () => {
    const columns = buildTicketsColumns(schema, {
      onDraftIconClick: () => {}
    })
    expect(columns[0]?.id).toBe(TICKET_TABLE_DRAFT_GROUP_ID)
    expect(columns.map((c) => c.accessorKey)).toEqual([TICKET_TABLE_DRAFT_GROUP_ID, ...schemaNames])
  })

  it('uses default column sizes on defs (persisted widths via columnSizing state)', () => {
    const columns = buildTicketsColumns(schema)
    expect(columns.find((c) => c.accessorKey === 'motif')?.size).toBe(200)
    expect(columns.find((c) => c.accessorKey === 'id_lot')?.size).toBe(180)
    expect(columns.find((c) => c.accessorKey === 'motif')?.enableResizing).toBe(true)
  })
})

describe('tanstack column state helpers', () => {
  it('maps hidden columns to column visibility', () => {
    expect(hiddenColumnsToColumnVisibility(schemaNames, ['motif'])).toEqual({
      motif: false,
      id_reclamation: true,
      type_affaire: true,
      id_locataire: true,
      id_lot: true
    })
    expect(columnVisibilityToHiddenColumns(schemaNames, { motif: false, id_lot: false })).toEqual([
      'motif',
      'id_lot'
    ])
  })

  it('splits and merges pinned vs unpinned order', () => {
    const full = ['id_reclamation', 'motif', 'id_locataire', 'id_lot', 'type_affaire']
    const pinned = ['id_reclamation', 'id_locataire']
    expect(resolveUnpinnedColumnOrder(full, pinned)).toEqual(['motif', 'id_lot', 'type_affaire'])
    expect(mergeFullColumnOrder(pinned, ['motif', 'id_lot'])).toEqual([
      'id_reclamation',
      'id_locataire',
      'motif',
      'id_lot'
    ])
  })

  it('resolvePinnedColumns keeps visible default pins in column order', () => {
    const visible = resolveVisibleColumnNames(schemaNames, {
      columnOrder: ['motif', 'id_reclamation', 'id_locataire', 'id_lot'],
      hiddenColumns: ['id_locataire']
    })
    expect(resolvePinnedColumns(visible)).toEqual(['id_reclamation', 'id_lot'])
  })

  it('resolvePinnedColumns honors user pin preferences', () => {
    const order = resolveColumnOrder(schemaNames)
    expect(resolvePinnedColumns(order, ['motif', 'id_reclamation'])).toEqual([
      'id_reclamation',
      'motif'
    ])
  })
})

describe('getTicketId', () => {
  it('returns trimmed id_reclamation string', () => {
    expect(getTicketId({ id_reclamation: ' REQ-1 ' })).toBe('REQ-1')
  })

  it('coerces numeric id_reclamation', () => {
    expect(getTicketId({ id_reclamation: 42 })).toBe('42')
  })
})

import { describe, expect, it } from 'bun:test'

import type { ColumnDef } from '@tanstack/react-table'

import type { PierreTableFeatures } from '@/shared/components/table/table-features'
import { getTicketId } from '@/shared/lib/ticket-row'
import { resolveTicketColumnLabel } from '@/shared/lib/ui-settings/schema'
import {
  DEFAULT_PINNED_COLUMNS,
  TICKET_TABLE_ALERT_COLUMN_ID,
  columnVisibilityToHiddenColumns,
  hiddenColumnsToColumnVisibility,
  mergeFullColumnOrder,
  resolveColumnOrder,
  resolvePinnedColumns,
  resolveUnpinnedColumnOrder,
  resolveVisibleColumnNames
} from '@/shared/lib/ui-settings/tickets-table'
import type { TicketRow, TicketsColumnMeta } from '@/shared/types'

import { buildTicketsColumns, isSqlNumericType, isTicketsNumericColumn } from './tickets-columns'

const schema: TicketsColumnMeta[] = [
  { name: 'motif', type: 'TEXT' },
  { name: 'id_reclamation', type: 'TEXT' },
  { name: 'type_affaire', type: 'TEXT' },
  { name: 'id_locataire', type: 'TEXT' },
  { name: 'id_lot', type: 'TEXT' }
]

const schemaNames = schema.map((c) => c.name)

function columnAccessorKey(column: ColumnDef<PierreTableFeatures, TicketRow>): string | undefined {
  return 'accessorKey' in column ? String(column.accessorKey) : undefined
}

describe('sql column kinds', () => {
  it('détecte les types SQLite numériques', () => {
    expect(isSqlNumericType('INTEGER')).toBe(true)
    expect(isSqlNumericType('REAL')).toBe(true)
    expect(isSqlNumericType('NUMERIC')).toBe(true)
    expect(isSqlNumericType('TEXT')).toBe(false)
    expect(isSqlNumericType('DATE')).toBe(false)
  })

  it('ne traite pas les identifiants comme numériques', () => {
    const mixed: TicketsColumnMeta[] = [
      { name: 'id_reclamation', type: 'INTEGER' },
      { name: 'montant', type: 'REAL' },
      { name: 'motif', type: 'TEXT' }
    ]
    expect(isTicketsNumericColumn('id_reclamation', mixed)).toBe(false)
    expect(isTicketsNumericColumn('montant', mixed)).toBe(true)
    expect(isTicketsNumericColumn('motif', mixed)).toBe(false)
  })

  it('ne traite pas les dates comme des montants', () => {
    const dated: TicketsColumnMeta[] = [
      { name: 'date_creation', type: 'NUMERIC' },
      { name: 'montant', type: 'REAL' }
    ]
    expect(isTicketsNumericColumn('date_creation', dated)).toBe(false)
    expect(isTicketsNumericColumn('montant', dated)).toBe(true)
  })
})

describe('buildTicketsColumns', () => {
  it('defines all schema columns for TanStack visibility and order', () => {
    const columns = buildTicketsColumns(schema)
    expect(columns[0]?.id).toBe(TICKET_TABLE_ALERT_COLUMN_ID)
    expect(columns.slice(1).map((c) => columnAccessorKey(c))).toEqual(schemaNames)
    expect(DEFAULT_PINNED_COLUMNS).toEqual(['id_reclamation', 'id_locataire', 'id_lot'])
    const idCol = columns.find((c) => columnAccessorKey(c) === 'id_reclamation')
    expect(idCol?.enableHiding).toBe(true)
    expect(resolveTicketColumnLabel('type_affaire')).toBe('type_affaire')
    expect(
      resolveTicketColumnLabel('motif', {
        tickets: { table: { columnLabels: { motif: 'Motif' } } }
      })
    ).toBe('Motif')
    expect(typeof columns.find((c) => columnAccessorKey(c) === 'id_lot')?.header).toBe('function')
  })

  it('prepends the locked unread notification column', () => {
    const columns = buildTicketsColumns(schema, {
      hasUnread: (row) => row.id_reclamation === 'REQ-1'
    })
    expect(columns[0]?.id).toBe(TICKET_TABLE_ALERT_COLUMN_ID)
    expect(columns[0]?.enableHiding).toBe(false)
    expect(columns[0]?.enableResizing).toBe(false)
    expect(columns.slice(1).map((c) => columnAccessorKey(c))).toEqual(schemaNames)
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

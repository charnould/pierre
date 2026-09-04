import type { ColumnDef } from '@tanstack/react-table'

import type {
  AnyPierreColumn,
  AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import type { PierreTableFeatures } from '@/shared/components/table/table-features'
import { UnreadPingIndicator } from '@/shared/components/table/UnreadPingIndicator'
import { getTicketCell } from '@/shared/lib/ticket-row'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import { TICKET_TABLE_ALERT_COLUMN_ID } from '@/shared/lib/ui-settings/tickets-table'
import type { TicketRow, TicketsColumnMeta } from '@/shared/types'

import { TicketCellValue } from './TicketCellValue'
import { TicketsColumnHeader } from './TicketsColumnHeader'

const DATA_CELL = 'tabular-nums'

/** SQLite type affinity used to right-align amounts (not identifiers). */
export function isSqlNumericType(type: string): boolean {
  const t = type.toUpperCase()
  return (
    t.includes('INT') ||
    t.includes('REAL') ||
    t.includes('FLOA') ||
    t.includes('DOUB') ||
    t.includes('NUM') ||
    t.includes('DEC')
  )
}

function isTicketsIdColumn(name: string): boolean {
  return name === 'id_reclamation' || name.startsWith('id_')
}

function isTicketsDateColumn(name: string): boolean {
  return name === 'date' || name.startsWith('date_')
}

export function isTicketsNumericColumn(columnId: string, columns: TicketsColumnMeta[]): boolean {
  const column = columns.find((entry) => entry.name === columnId)
  if (!column || isTicketsIdColumn(column.name) || isTicketsDateColumn(column.name)) return false
  return isSqlNumericType(column.type)
}

export type BuildTicketsColumnsOptions = {
  settings?: UiSettings
  columnFilters?: ColumnFilters
  url?: string
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  hasUnread?: (row: TicketRow) => boolean
}

function buildAlertColumn(
  hasUnread: NonNullable<BuildTicketsColumnsOptions['hasUnread']>
): ColumnDef<PierreTableFeatures, TicketRow> {
  return {
    id: TICKET_TABLE_ALERT_COLUMN_ID,
    accessorFn: (row) => (hasUnread(row) ? 1 : 0),
    enableHiding: false,
    enableSorting: true,
    enableResizing: false,
    size: 40,
    header: () => <span className="sr-only">Notifications non lues</span>,
    cell: ({ row }) => {
      const unread = hasUnread(row.original)
      const label = unread ? 'Notification non lue' : 'Aucune notification'
      return (
        <div
          className="flex items-center justify-center"
          role={unread ? 'img' : undefined}
          aria-label={label}
          title={label}
        >
          {unread ? <UnreadPingIndicator /> : null}
        </div>
      )
    }
  }
}

export function buildTicketsColumns(
  columns: TicketsColumnMeta[],
  options: BuildTicketsColumnsOptions = {}
): ColumnDef<PierreTableFeatures, TicketRow>[] {
  const dataColumns: ColumnDef<PierreTableFeatures, TicketRow>[] = columns.map(({ name }) => {
    const title = resolveTicketColumnLabel(name, options.settings)
    const numeric = isTicketsNumericColumn(name, columns)
    const date = isTicketsDateColumn(name)
    const tabular = numeric || date || isTicketsIdColumn(name)

    return {
      accessorKey: name,
      id: name,
      enableHiding: true,
      header: ({ column, table }) => (
        <TicketsColumnHeader
          column={column as AnyPierreColumn}
          table={table as AnyPierreTable}
          title={title}
          columnName={name}
          url={options.url}
          columnFilters={options.columnFilters}
          onColumnFiltersChange={options.onColumnFiltersChange}
        />
      ),
      cell: ({ row }) => {
        const value = getTicketCell(row.original, name)
        return (
          <TicketCellValue
            column={name}
            value={value}
            columnValues={options.settings?.tickets?.table?.columnValues}
            className={tabular ? DATA_CELL : undefined}
          />
        )
      }
    }
  })

  return [buildAlertColumn(options.hasUnread ?? (() => false)), ...dataColumns]
}

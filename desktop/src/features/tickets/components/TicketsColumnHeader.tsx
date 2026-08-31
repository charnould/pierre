import {
  type AnyPierreColumn,
  type AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import { DataColumnHeader } from '@/shared/components/table/DataColumnHeader'
import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import { TICKET_TABLE_DRAFT_GROUP_ID } from '@/shared/lib/ui-settings/tickets-table'

import { TicketColumnFilter } from './TicketColumnFilter'

interface Props {
  column: AnyPierreColumn
  table: AnyPierreTable
  title: string
  columnName: string
  align?: 'left' | 'right'
  url?: string
  columnFilters?: ColumnFilters
  onColumnFiltersChange?: (filters: ColumnFilters) => void
}

const lockedIds = new Set<string>([TICKET_TABLE_DRAFT_GROUP_ID])

export function TicketsColumnHeader({
  column,
  table,
  title,
  columnName,
  align = 'left',
  url,
  columnFilters,
  onColumnFiltersChange
}: Props) {
  const selectedFilters = columnFilters?.[columnName] ?? []
  const canFilter = Boolean(url && onColumnFiltersChange)

  return (
    <DataColumnHeader
      title={title}
      align={align}
      titleClassName="truncate font-normal text-muted-foreground"
      optionsMenu={
        <TicketColumnFilter
          column={column}
          table={table}
          url={url}
          columnName={columnName}
          columnLabel={title}
          selected={selectedFilters}
          compact
          enableColorize
          enableFacets={canFilter}
          lockedColumnIds={lockedIds}
          onChange={(values) => {
            if (!onColumnFiltersChange) return
            const next = { ...columnFilters }
            if (values.length === 0) delete next[columnName]
            else next[columnName] = values
            onColumnFiltersChange(next)
          }}
        />
      }
    />
  )
}

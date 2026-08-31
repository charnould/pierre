import type {
  AnyPierreColumn,
  AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import { DataColumnHeader } from '@/shared/components/table/DataColumnHeader'
import type { ColumnFilters, ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import { isRepaymentFilterableColumn } from '../lib/repayment-column-filters'
import type { TenantLastAction } from '../lib/repayment-last-action'
import { LOCKED_REPAYMENT_COLUMN_IDS, type RepaymentColumnId } from '../lib/repayment-table-columns'
import { RepaymentColumnFilter } from './RepaymentColumnFilter'

interface Props {
  column: AnyPierreColumn
  table: AnyPierreTable
  title: string
  columnId: RepaymentColumnId
  align?: 'left' | 'right'
  /** Accessible name for the options trigger when `title` is empty. */
  menuAriaLabel?: string
  allRows?: TenantRepaymentRow[]
  columnFilters?: ColumnFilters
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (
    updater: ColumnValuesConfig | ((prev: ColumnValuesConfig | undefined) => ColumnValuesConfig)
  ) => void
  getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  snapshotDate?: string
}

const lockedIds = new Set<string>(LOCKED_REPAYMENT_COLUMN_IDS)

export function RepaymentColumnHeader({
  column,
  table,
  title,
  columnId,
  align = 'left',
  menuAriaLabel,
  allRows = [],
  columnFilters,
  onColumnFiltersChange,
  columnValues,
  onColumnValuesChange,
  getBucket,
  getLastAction,
  snapshotDate
}: Props) {
  const selectedFilters = columnFilters?.[columnId] ?? []
  const canFilter = isRepaymentFilterableColumn(columnId) && Boolean(onColumnFiltersChange)
  const columnLabel = title || menuAriaLabel || 'Options colonne'

  return (
    <DataColumnHeader
      title={title}
      align={align}
      titleClassName="truncate font-normal text-muted-foreground"
      optionsMenu={
        <RepaymentColumnFilter
          column={column}
          table={table}
          columnId={columnId}
          columnLabel={columnLabel}
          selected={selectedFilters}
          allRows={allRows}
          getters={{ getBucket, getLastAction, snapshotDate }}
          columnValues={columnValues}
          onColumnValuesChange={onColumnValuesChange}
          lockedColumnIds={lockedIds}
          enableFacets={canFilter}
          onChange={(values) => {
            if (!onColumnFiltersChange) return
            const next = { ...columnFilters }
            if (values.length === 0) delete next[columnId]
            else next[columnId] = values
            onColumnFiltersChange(next)
          }}
        />
      }
    />
  )
}

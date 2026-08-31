import type { ColumnDef } from '@tanstack/react-table'

import type {
  AnyPierreColumn,
  AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import type { PierreTableFeatures } from '@/shared/components/table/table-features'
import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'
import type { ColumnValuesConfig, ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { formatRepaymentDateIso } from '../lib/format-repayment'
import { getRepaymentActionMeta } from '../lib/repayment-action'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import type { TenantLastAction } from '../lib/repayment-last-action'
import type { RepaymentRowSignal } from '../lib/repayment-row-signal'
import {
  DEFAULT_LEDGER_COLUMN_WIDTH,
  DEFAULT_REPAYMENT_COLUMN_SIZING,
  isRepaymentNumericColumn,
  isRepaymentUiColumnId,
  type RepaymentColumnId
} from '../lib/repayment-table-columns'
import { daysSinceToday } from '../lib/repayment-timeline-days'
import { DebtAmountCell } from './DebtAmountCell'
import { DebtRentRatioCell } from './DebtRentRatioCell'
import { RepaymentActionCell } from './RepaymentActionCell'
import { RepaymentAlertesCell } from './RepaymentAlertesCell'
import { RepaymentBucketCell } from './RepaymentBucketCell'
import { RepaymentCellValue } from './RepaymentCellValue'
import { RepaymentColumnHeader } from './RepaymentColumnHeader'
import { RepaymentGestionnaireCell } from './RepaymentGestionnaireCell'

type BuildOptions = {
  rows: TenantRepaymentRow[]
  allRows?: TenantRepaymentRow[]
  activeColumnIds: RepaymentColumnId[]
  columnFilters?: ColumnFilters
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (
    updater: ColumnValuesConfig | ((prev: ColumnValuesConfig | undefined) => ColumnValuesConfig)
  ) => void
  getBucket?: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction?: (row: TenantRepaymentRow) => TenantLastAction | null
  getRowSignal?: (row: TenantRepaymentRow) => RepaymentRowSignal | null
  snapshotDate?: string
}

export function buildRepaymentColumns(
  options: BuildOptions
): ColumnDef<PierreTableFeatures, TenantRepaymentRow>[] {
  const { rows, columnValues, onColumnValuesChange, allRows = rows, activeColumnIds } = options
  const activeSet = new Set(activeColumnIds)

  const header = (
    column: Parameters<typeof RepaymentColumnHeader>[0]['column'],
    table: Parameters<typeof RepaymentColumnHeader>[0]['table'],
    columnId: RepaymentColumnId,
    title = columnId,
    menuAriaLabel?: string
  ) => (
    <RepaymentColumnHeader
      column={column}
      table={table}
      title={title}
      columnId={columnId}
      menuAriaLabel={menuAriaLabel}
      allRows={allRows}
      columnFilters={options.columnFilters}
      onColumnFiltersChange={options.onColumnFiltersChange}
      columnValues={columnValues}
      onColumnValuesChange={onColumnValuesChange}
      getBucket={options.getBucket}
      getLastAction={options.getLastAction}
      snapshotDate={options.snapshotDate}
    />
  )

  const uiColumns: ColumnDef<PierreTableFeatures, TenantRepaymentRow>[] = [
    {
      id: 'alertes',
      accessorFn: (row) => (options.getRowSignal?.(row)?.hasUnread ? 1 : 0),
      header: ({ column, table }) =>
        header(
          column as AnyPierreColumn,
          table as AnyPierreTable,
          'alertes',
          '',
          'Trier les notifications'
        ),
      cell: ({ row }) => (
        <RepaymentAlertesCell signal={options.getRowSignal?.(row.original) ?? null} />
      ),
      enableSorting: Boolean(options.getRowSignal),
      sortFn: 'basic',
      enableHiding: false,
      size: DEFAULT_REPAYMENT_COLUMN_SIZING.alertes
    },
    {
      id: 'bucket',
      accessorFn: (row) => options.getBucket?.(row) ?? '',
      header: ({ column, table }) =>
        header(column as AnyPierreColumn, table as AnyPierreTable, 'bucket'),
      cell: ({ row }) => {
        const getBucket = options.getBucket
        if (!getBucket) return <span>—</span>

        return <RepaymentBucketCell value={getBucket(row.original)} columnValues={columnValues} />
      },
      enableSorting: Boolean(options.getBucket),
      sortFn: 'text',
      enableHiding: false,
      size: DEFAULT_REPAYMENT_COLUMN_SIZING.bucket
    },
    {
      id: 'derniere_action_realisee',
      accessorFn: (row) => {
        const last = options.getLastAction?.(row)
        return last ? getRepaymentActionMeta(last.action).label : ''
      },
      header: ({ column, table }) =>
        header(column as AnyPierreColumn, table as AnyPierreTable, 'derniere_action_realisee'),
      cell: ({ row }) => {
        const last = options.getLastAction?.(row.original)
        if (!last) return <span>—</span>
        return <RepaymentActionCell action={last.action} columnValues={columnValues} />
      },
      enableSorting: Boolean(options.getLastAction),
      sortFn: 'text',
      size: DEFAULT_REPAYMENT_COLUMN_SIZING.derniere_action_realisee
    },
    {
      id: 'date_derniere_action_realisee',
      accessorFn: (row) => {
        const last = options.getLastAction?.(row)
        if (!last) return -1
        return daysSinceToday(last.date)
      },
      header: ({ column, table }) =>
        header(column as AnyPierreColumn, table as AnyPierreTable, 'date_derniere_action_realisee'),
      cell: ({ row }) => {
        const last = options.getLastAction?.(row.original)
        if (!last) {
          return <span className="block truncate tabular-nums">—</span>
        }
        const days = daysSinceToday(last.date)
        return (
          <span className="block truncate tabular-nums">
            {formatRepaymentDateIso(last.date)}
            <span className="text-muted-foreground"> · {days}j.</span>
          </span>
        )
      },
      enableSorting: Boolean(options.getLastAction),
      sortFn: 'basic',
      size: DEFAULT_REPAYMENT_COLUMN_SIZING.date_derniere_action_realisee
    }
  ]

  const ledgerColumnIds = activeColumnIds.filter((id) => !isRepaymentUiColumnId(id))

  const ledgerColumns: ColumnDef<PierreTableFeatures, TenantRepaymentRow>[] = ledgerColumnIds.map(
    (columnId) => {
      if (columnId === 'solde_locataire') {
        return {
          id: columnId,
          accessorKey: columnId,
          header: ({ column, table }) =>
            header(column as AnyPierreColumn, table as AnyPierreTable, columnId),
          cell: ({ getValue }) => (
            <DebtAmountCell amount={Number(getValue() ?? 0)} className="block font-medium" />
          ),
          enableSorting: true,
          sortFn: 'basic',
          size: DEFAULT_REPAYMENT_COLUMN_SIZING.solde_locataire
        }
      }

      if (columnId === 'ratio_dette_loyer') {
        return {
          id: columnId,
          accessorKey: columnId,
          header: ({ column, table }) =>
            header(column as AnyPierreColumn, table as AnyPierreTable, columnId),
          cell: ({ row }) => (
            <DebtRentRatioCell ratio={row.original.ratio_dette_loyer} columnValues={columnValues} />
          ),
          enableSorting: true,
          sortFn: 'basic',
          size: DEFAULT_REPAYMENT_COLUMN_SIZING.ratio_dette_loyer
        }
      }

      if (columnId === 'gestionnaire') {
        return {
          id: columnId,
          accessorFn: (row) => {
            const value = row['gestionnaire']
            if (value == null || value === '') return ''
            return formatOrgCollaboratorLabel(String(value))
          },
          header: ({ column, table }) =>
            header(column as AnyPierreColumn, table as AnyPierreTable, columnId),
          cell: ({ row, getValue }) => {
            const raw = row.original['gestionnaire']
            const identity = raw == null || raw === '' ? '' : String(raw)
            return (
              <RepaymentGestionnaireCell
                identity={identity}
                label={String(getValue() ?? '')}
                columnValues={columnValues}
              />
            )
          },
          enableSorting: true,
          sortFn: 'alphanumeric',
          size: DEFAULT_REPAYMENT_COLUMN_SIZING.gestionnaire
        }
      }

      const numeric = isRepaymentNumericColumn(columnId)
      return {
        id: columnId,
        accessorKey: columnId,
        header: ({ column, table }) =>
          header(column as AnyPierreColumn, table as AnyPierreTable, columnId),
        cell: ({ getValue }) => (
          <RepaymentCellValue
            column={columnId}
            value={getValue()}
            columnValues={columnValues}
            className={numeric ? 'block tabular-nums' : undefined}
          />
        ),
        enableSorting: true,
        sortFn: numeric ? 'basic' : 'alphanumeric',
        size: DEFAULT_REPAYMENT_COLUMN_SIZING[columnId] ?? DEFAULT_LEDGER_COLUMN_WIDTH
      }
    }
  )

  return [...uiColumns, ...ledgerColumns].filter((column) =>
    activeSet.has(column.id as RepaymentColumnId)
  )
}

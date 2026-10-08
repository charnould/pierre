import { type RefObject, useMemo } from 'react'

import { BoardPhaseSection } from '@/shared/components/board/board-surface'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { formatEuro } from '../lib/format-repayment'
import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'
import { filterRepaymentRows } from '../lib/repayment-column-filters'
import type { TenantLastAction } from '../lib/repayment-last-action'
import type { RepaymentRowSignal } from '../lib/repayment-row-signal'
import {
  type ColumnValuesUpdater,
  useRepaymentTableFilters,
  useRepaymentTablePreferences
} from '../lib/use-repayment-table-preferences'
import { RepaymentBucketSectionActions } from './RepaymentBucketSectionActions'
import { RepaymentTableView } from './RepaymentTableView'

interface Props {
  bucket: RepaymentBucketId
  bucketRows: TenantRepaymentRow[]
  ledgerColumnIds: readonly string[]
  selectedId: string | null
  snapshotDate?: string
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (updater: ColumnValuesUpdater) => void
  onRowClick: (row: TenantRepaymentRow) => void
  onRowHover?: (row: TenantRepaymentRow) => void
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction: (row: TenantRepaymentRow) => TenantLastAction | null
  getRowSignal: (row: TenantRepaymentRow) => RepaymentRowSignal | null
  scrollRef: RefObject<HTMLElement | null>
}

export function RepaymentBucketTableBlock({
  bucket,
  bucketRows,
  ledgerColumnIds,
  selectedId,
  snapshotDate,
  columnValues,
  onColumnValuesChange,
  onRowClick,
  onRowHover,
  getBucket,
  getLastAction,
  getRowSignal,
  scrollRef
}: Props) {
  const {
    columnFilters,
    setColumnFilters,
    columnSorting,
    setColumnSorting,
    hasActiveColumnFilters,
    hasActiveColumnSorting,
    clearColumnFilters,
    clearColumnSorting
  } = useRepaymentTableFilters(bucket)

  const {
    activeColumnIds,
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    columnVisibility,
    setColumnVisibility,
    toggleColumnVisibility
  } = useRepaymentTablePreferences(ledgerColumnIds, bucket)

  const filterGetters = useMemo(
    () => ({
      getBucket,
      getLastAction,
      snapshotDate
    }),
    [getBucket, getLastAction, snapshotDate]
  )

  const filteredRows = useMemo(
    () => filterRepaymentRows(bucketRows, columnFilters, filterGetters),
    [bucketRows, columnFilters, filterGetters]
  )
  const countLabel = `${bucketRows.length} dossier${bucketRows.length === 1 ? '' : 's'}`
  const totalSolde = useMemo(
    () => bucketRows.reduce((sum, row) => sum + row.solde_locataire, 0),
    [bucketRows]
  )
  const phaseEmpty = bucketRows.length === 0
  const filteredEmpty = !phaseEmpty && filteredRows.length === 0

  return (
    <BoardPhaseSection
      title={getRepaymentBucketMeta(bucket).label}
      meta={phaseEmpty ? countLabel : `${countLabel} · ${formatEuro(totalSolde)}`}
      empty={phaseEmpty}
      actions={
        <RepaymentBucketSectionActions
          activeColumnIds={activeColumnIds}
          columnVisibility={columnVisibility}
          onToggleColumn={toggleColumnVisibility}
          hasActiveColumnFilters={hasActiveColumnFilters}
          hasActiveColumnSorting={hasActiveColumnSorting}
          onClearColumnFilters={clearColumnFilters}
          onClearColumnSorting={clearColumnSorting}
        />
      }
      note={filteredEmpty ? 'Aucun dossier ne correspond aux filtres.' : undefined}
    >
      {filteredEmpty ? null : (
        <RepaymentTableView
          rows={filteredRows}
          allRows={bucketRows}
          activeColumnIds={activeColumnIds}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          columnSorting={columnSorting}
          onColumnSortingChange={setColumnSorting}
          selectedId={selectedId}
          onRowClick={onRowClick}
          onRowHover={onRowHover}
          getBucket={getBucket}
          getLastAction={getLastAction}
          getRowSignal={getRowSignal}
          snapshotDate={snapshotDate}
          columnValues={columnValues}
          onColumnValuesChange={onColumnValuesChange}
          scrollRef={scrollRef}
        />
      )}
    </BoardPhaseSection>
  )
}

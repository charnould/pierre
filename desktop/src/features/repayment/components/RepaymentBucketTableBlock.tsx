import { useMemo, type RefObject } from 'react'

import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import { filterRepaymentRows } from '../lib/repayment-column-filters'
import type { TenantLastAction } from '../lib/repayment-last-action'
import type { RepaymentRowSignal } from '../lib/repayment-row-signal'
import {
  useRepaymentTableFilters,
  useRepaymentTablePreferences,
  type ColumnValuesUpdater
} from '../lib/use-repayment-table-preferences'
import { RepaymentBucketEmpty } from './RepaymentBucketEmpty'
import { RepaymentBucketSection } from './RepaymentBucketSection'
import { RepaymentBucketSectionActions } from './RepaymentBucketSectionActions'
import { RepaymentTableView } from './RepaymentTableView'

interface Props {
  bucket: RepaymentBucketId
  bucketRows: TenantRepaymentRow[]
  ledgerColumnIds: readonly string[]
  selectedId: string | null
  loading: boolean
  snapshotDate?: string
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (updater: ColumnValuesUpdater) => void
  onRowClick: (row: TenantRepaymentRow) => void
  onRowHover?: (row: TenantRepaymentRow) => void
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
  getLastAction: (row: TenantRepaymentRow) => TenantLastAction | null
  getRowSignal: (row: TenantRepaymentRow) => RepaymentRowSignal | null
  onReload: () => void
  scrollRef: RefObject<HTMLElement | null>
}

export function RepaymentBucketTableBlock({
  bucket,
  bucketRows,
  ledgerColumnIds,
  selectedId,
  loading,
  snapshotDate,
  columnValues,
  onColumnValuesChange,
  onRowClick,
  onRowHover,
  getBucket,
  getLastAction,
  getRowSignal,
  onReload,
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

  const totalSolde = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.solde_locataire, 0),
    [filteredRows]
  )

  return (
    <RepaymentBucketSection
      bucket={bucket}
      visibleCount={filteredRows.length}
      totalSolde={totalSolde}
      actions={
        <RepaymentBucketSectionActions
          activeColumnIds={activeColumnIds}
          columnVisibility={columnVisibility}
          onToggleColumn={toggleColumnVisibility}
          loading={loading}
          hasActiveColumnFilters={hasActiveColumnFilters}
          hasActiveColumnSorting={hasActiveColumnSorting}
          onClearColumnFilters={clearColumnFilters}
          onClearColumnSorting={clearColumnSorting}
          onReload={onReload}
        />
      }
    >
      {filteredRows.length === 0 ? (
        <RepaymentBucketEmpty bucketEmpty={bucketRows.length === 0} />
      ) : (
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
    </RepaymentBucketSection>
  )
}

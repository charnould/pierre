import type { ColumnVisibilityState } from '@tanstack/react-table'
import { ArrowDownUp, FilterX } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import type { RepaymentColumnId } from '../lib/repayment-table-columns'
import { RepaymentColumnVisibilityMenu } from './RepaymentColumnVisibilityMenu'

interface Props {
  activeColumnIds: RepaymentColumnId[]
  columnVisibility: ColumnVisibilityState
  onToggleColumn: (columnId: RepaymentColumnId, visible: boolean) => void
  hasActiveColumnFilters: boolean
  hasActiveColumnSorting: boolean
  onClearColumnFilters: () => void
  onClearColumnSorting: () => void
}

export function RepaymentBucketSectionActions({
  activeColumnIds,
  columnVisibility,
  onToggleColumn,
  hasActiveColumnFilters,
  hasActiveColumnSorting,
  onClearColumnFilters,
  onClearColumnSorting
}: Props) {
  return (
    <>
      <RepaymentColumnVisibilityMenu
        activeColumnIds={activeColumnIds}
        columnVisibility={columnVisibility}
        onToggleColumn={onToggleColumn}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasActiveColumnFilters}
        onClick={onClearColumnFilters}
      >
        <FilterX data-icon="inline-start" />
        Effacer les filtres
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasActiveColumnSorting}
        onClick={onClearColumnSorting}
      >
        <ArrowDownUp data-icon="inline-start" />
        Effacer les tris
      </Button>
    </>
  )
}

import type { ColumnVisibilityState } from '@tanstack/react-table'
import { ArrowDownUp, FilterX, RefreshCw } from 'lucide-react'

import { Button, buttonVariants } from '@/shared/components/ui/button'

import type { RepaymentColumnId } from '../lib/repayment-table-columns'
import { RepaymentColumnVisibilityMenu } from './RepaymentColumnVisibilityMenu'

interface Props {
  activeColumnIds: RepaymentColumnId[]
  columnVisibility: ColumnVisibilityState
  onToggleColumn: (columnId: RepaymentColumnId, visible: boolean) => void
  loading: boolean
  hasActiveColumnFilters: boolean
  hasActiveColumnSorting: boolean
  onClearColumnFilters: () => void
  onClearColumnSorting: () => void
  onReload: () => void
}

export function RepaymentBucketSectionActions({
  activeColumnIds,
  columnVisibility,
  onToggleColumn,
  loading,
  hasActiveColumnFilters,
  hasActiveColumnSorting,
  onClearColumnFilters,
  onClearColumnSorting,
  onReload
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      <RepaymentColumnVisibilityMenu
        activeColumnIds={activeColumnIds}
        columnVisibility={columnVisibility}
        onToggleColumn={onToggleColumn}
        triggerClassName={buttonVariants({
          variant: 'outline',
          size: 'sm'
        })}
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

      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onReload}>
        <RefreshCw data-icon="inline-start" className={loading ? 'animate-spin' : undefined} />
        Actualiser
      </Button>
    </div>
  )
}

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import type { AnyPierreColumn } from './column-header-options-menu'

interface Props {
  title: string
  /** Unified options menu (Filter icon); omitted only for compact system columns. */
  optionsMenu?: ReactNode
  column?: AnyPierreColumn
  sortLabel?: string
}

export function cycleColumnSort(column: {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc?: boolean) => void
  clearSorting: () => void
}) {
  const sorted = column.getIsSorted()
  if (sorted === false) column.toggleSorting(false)
  else if (sorted === 'asc') column.toggleSorting(true)
  else column.clearSorting()
}

export function DataColumnHeader({ title, optionsMenu, column, sortLabel }: Props) {
  const canSort = column?.getCanSort() ?? false

  return (
    <div className={cn('flex w-full min-w-0 items-center gap-0.5', optionsMenu && 'pe-2')}>
      {title ? (
        <span className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      {canSort || optionsMenu ? (
        <span className="relative z-20 flex shrink-0 items-center gap-0.5">
          {canSort && column ? (
            <ColumnSortButton column={column} label={sortLabel || title || 'colonne'} />
          ) : null}
          {optionsMenu}
        </span>
      ) : null}
    </div>
  )
}

function ColumnSortButton({ column, label }: { column: AnyPierreColumn; label: string }) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
  const name =
    sorted === 'asc'
      ? `Tri croissant de ${label}. Passer au tri décroissant`
      : sorted === 'desc'
        ? `Tri décroissant de ${label}. Retirer le tri`
        : `Trier ${label}`

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={name}
      aria-pressed={sorted !== false}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        cycleColumnSort(column)
      }}
    >
      <Icon data-icon="inline-start" />
    </Button>
  )
}

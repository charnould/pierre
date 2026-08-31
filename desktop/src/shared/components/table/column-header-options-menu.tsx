import type { Column, Header, Row, Table } from '@tanstack/react-table'
import { ArrowLeftIcon, ArrowRightIcon, EyeOffIcon, Filter } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from '@/shared/components/ui/dropdown-menu'
import { columnDecolorizeButtonLabel } from '@/shared/lib/ui-settings/column-value-palette'
import { cn } from '@/shared/lib/utils'

import type { PierreTableFeatures } from './table-features'

/** Loose column/table refs — TanStack v9 Column/Table are invariant in TData. */
export type AnyPierreColumn = Column<PierreTableFeatures, any>
export type AnyPierreTable = Table<PierreTableFeatures, any>
export type AnyPierreHeader = Header<PierreTableFeatures, any, unknown>
export type AnyPierreRow = Row<PierreTableFeatures, any>

interface TriggerProps extends ComponentProps<typeof Button> {
  columnLabel: string
  compact?: boolean
  highlighted?: boolean
  badgeCount?: number
}

export function ColumnHeaderOptionsTrigger({
  columnLabel,
  compact = true,
  highlighted = false,
  badgeCount = 0,
  className,
  onPointerDown,
  ...props
}: TriggerProps) {
  const hasBadge = badgeCount > 0
  return (
    <Button
      type="button"
      variant={highlighted ? 'secondary' : 'ghost'}
      size="icon-xs"
      className={cn('relative shrink-0 px-0', compact ? 'size-5' : 'size-6', className)}
      aria-label={
        hasBadge
          ? `Options ${columnLabel} — ${badgeCount} valeur${badgeCount > 1 ? 's' : ''} sélectionnée${badgeCount > 1 ? 's' : ''}`
          : `Options ${columnLabel}`
      }
      onPointerDown={(event) => {
        event.stopPropagation()
        onPointerDown?.(event)
      }}
      {...props}
    >
      <Filter data-icon="inline-start" className={compact ? 'size-2.5' : 'size-3.5'} />
      {hasBadge ? (
        <span
          aria-hidden
          className={cn(
            'bg-primary ring-background absolute rounded-full ring-1',
            compact ? 'top-px right-px size-1.5' : 'top-0.5 right-0.5 size-2'
          )}
        />
      ) : null}
    </Button>
  )
}

interface SortItemsProps {
  sortColumn: AnyPierreColumn
}

function ColumnHeaderSortMenuItems({ sortColumn }: SortItemsProps) {
  const sorted = sortColumn.getIsSorted()

  return (
    <DropdownMenuRadioGroup
      value={sorted === false ? 'none' : sorted}
      onValueChange={(value) => {
        if (value === 'asc') sortColumn.toggleSorting(false)
        else if (value === 'desc') sortColumn.toggleSorting(true)
        else sortColumn.clearSorting()
      }}
    >
      <DropdownMenuRadioItem value="asc" disabled={!sortColumn.getCanSort()}>
        Trier croissant
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="desc" disabled={!sortColumn.getCanSort()}>
        Trier décroissant
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="none" disabled={sorted === false}>
        Supprimer le tri
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  )
}

interface MoveItemsProps {
  table: AnyPierreTable
  columnId: string
  lockedColumnIds?: ReadonlySet<string>
}

function movableColumnIds(table: AnyPierreTable, lockedColumnIds?: ReadonlySet<string>): string[] {
  return table
    .getVisibleLeafColumns()
    .map((c) => c.id)
    .filter((id) => !lockedColumnIds?.has(id))
}

function moveColumn(
  table: AnyPierreTable,
  columnId: string,
  direction: -1 | 1,
  lockedColumnIds?: ReadonlySet<string>
) {
  const movable = movableColumnIds(table, lockedColumnIds)
  const neighbour = movable[movable.indexOf(columnId) + direction]
  if (!neighbour) return

  table.setColumnOrder((order) => {
    const next = [...order]
    const from = next.indexOf(columnId)
    const to = next.indexOf(neighbour)
    if (from === -1 || to === -1) return order
    next[from] = neighbour
    next[to] = columnId
    return next
  })
}

function ColumnHeaderMoveMenuItems({ table, columnId, lockedColumnIds }: MoveItemsProps) {
  const movable = movableColumnIds(table, lockedColumnIds)
  const position = movable.indexOf(columnId)

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        disabled={position <= 0}
        onClick={() => moveColumn(table, columnId, -1, lockedColumnIds)}
      >
        <ArrowLeftIcon />
        Déplacer vers la gauche
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={position === -1 || position >= movable.length - 1}
        onClick={() => moveColumn(table, columnId, 1, lockedColumnIds)}
      >
        <ArrowRightIcon />
        Déplacer vers la droite
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

interface HideItemProps {
  column: AnyPierreColumn
}

function ColumnHeaderHideMenuItem({ column }: HideItemProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        disabled={!column.getCanHide()}
        onClick={() => column.toggleVisibility(false)}
      >
        <EyeOffIcon />
        Masquer la colonne
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

interface ColorMenuItemsProps {
  colorizeLabel: string
  colorizing?: boolean
  onColorize: () => void | Promise<void>
  /** Absent tant que la colonne n'a aucun style à retirer. */
  onDecolorize?: () => void | Promise<void>
}

export function ColumnHeaderColorMenuItems({
  colorizeLabel,
  colorizing = false,
  onColorize,
  onDecolorize
}: ColorMenuItemsProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem disabled={colorizing} onClick={() => void onColorize()}>
        {colorizing ? 'Colorisation…' : colorizeLabel}
      </DropdownMenuItem>
      {onDecolorize ? (
        <DropdownMenuItem onClick={() => void onDecolorize()}>
          {columnDecolorizeButtonLabel()}
        </DropdownMenuItem>
      ) : null}
    </DropdownMenuGroup>
  )
}

interface LayoutMenuItemsProps {
  column: AnyPierreColumn
  table: AnyPierreTable
  lockedColumnIds?: ReadonlySet<string>
}

/** Sort + move L/R + hide — shared chrome for the unified column options menu. */
export function ColumnHeaderLayoutMenuItems({
  column,
  table,
  lockedColumnIds
}: LayoutMenuItemsProps) {
  return (
    <>
      {column.getCanSort() ? <ColumnHeaderSortMenuItems sortColumn={column} /> : null}
      {column.getCanSort() ? <DropdownMenuSeparator /> : null}
      <ColumnHeaderMoveMenuItems
        table={table}
        columnId={column.id}
        lockedColumnIds={lockedColumnIds}
      />
      <DropdownMenuSeparator />
      <ColumnHeaderHideMenuItem column={column} />
    </>
  )
}

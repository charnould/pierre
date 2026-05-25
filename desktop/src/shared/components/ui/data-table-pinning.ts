import type { Column } from '@tanstack/react-table'
import type { CSSProperties } from 'react'

/**
 * Pinning styles from TanStack Table column-pinning-sticky example.
 * @see https://tanstack.com/table/latest/docs/framework/react/examples/column-pinning-sticky
 */
export function isLastLeftPinnedColumn<TData>(column: Column<TData, unknown>): boolean {
  return column.getIsPinned() === 'left' && column.getIsLastColumn('left')
}

export function isFirstRightPinnedColumn<TData>(column: Column<TData, unknown>): boolean {
  return column.getIsPinned() === 'right' && column.getIsFirstColumn('right')
}

export const getCommonPinningStyles = <TData>(
  column: Column<TData, unknown>,
  isHeader = false
): CSSProperties => {
  const isPinned = column.getIsPinned()
  const lastLeftPinned = isLastLeftPinnedColumn(column)
  const firstRightPinned = isFirstRightPinnedColumn(column)

  let left: string | undefined
  let right: string | undefined

  if (isPinned === 'left') {
    try {
      left = `${column.getStart('left')}px`
    } catch {
      left = undefined
    }
  }

  if (isPinned === 'right') {
    try {
      right = `${column.getAfter('right')}px`
    } catch {
      right = undefined
    }
  }

  return {
    left,
    right,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    minWidth: column.getSize(),
    maxWidth: column.getSize(),
    zIndex: isPinned ? (isHeader ? 3 : 2) : isHeader ? 1 : 0,
    background: isPinned || isHeader ? 'var(--background)' : undefined,
    borderRight: lastLeftPinned ? '2px solid var(--border)' : undefined,
    borderLeft: firstRightPinned ? '2px solid var(--border)' : undefined
  }
}

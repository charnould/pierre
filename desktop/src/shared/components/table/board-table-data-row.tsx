import { flexRender, type Row, type RowData } from '@tanstack/react-table'

import { useBoardSelection } from '@/shared/components/board/board-selection'
import { TableCell, TableRow } from '@/shared/components/ui/table'

import type { PierreTableFeatures } from './table-features'

export function BoardTableDataRow<TData extends RowData>({
  row,
  index,
  measureRef,
  rowId,
  selected,
  onActivate,
  onHover
}: {
  row: Row<PierreTableFeatures, TData>
  index: number
  measureRef: (node: HTMLTableRowElement | null) => void
  rowId?: string
  selected: boolean
  onActivate: (data: TData) => void
  onHover?: (data: TData) => void
}) {
  const selection = useBoardSelection()
  const checked = rowId != null && selection?.checkedIds.has(rowId) === true
  const activate = () => onActivate(row.original)

  return (
    <TableRow
      variant="board"
      data-index={index}
      ref={measureRef}
      data-state={selected ? 'selected' : undefined}
      data-checked={checked ? true : undefined}
      aria-selected={selected}
      tabIndex={0}
      onClick={activate}
      onPointerEnter={onHover ? () => onHover(row.original) : undefined}
      onFocus={onHover ? () => onHover(row.original) : undefined}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        const target = event.target
        if (
          target instanceof Element &&
          target.closest('[data-slot="checkbox"],button,a,input,textarea,select')
        ) {
          return
        }
        event.preventDefault()
        activate()
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} variant="board" className="max-w-0 overflow-hidden text-start">
          <div className="truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </TableCell>
      ))}
    </TableRow>
  )
}

import { boardTableClassName } from '@/shared/components/table/board-dual-table'
import { useSyncedHorizontalScroll } from '@/shared/components/table/use-synced-horizontal-scroll'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { TicketsColumnMeta } from '@/shared/types'

const SKELETON_ROW_COUNT = 8
const COLUMN_WIDTH = 140

interface Props {
  columns: TicketsColumnMeta[]
  settings?: UiSettings
}

export function TicketsTableSkeleton({ columns, settings }: Props) {
  const { headerScrollRef, bodyScrollRef, onHeaderScroll, onBodyScroll } =
    useSyncedHorizontalScroll()
  const tableWidth = Math.max(columns.length, 1) * COLUMN_WIDTH

  const colgroup = () => (
    <colgroup>
      {columns.map((col) => (
        <col key={col.name} className="w-[8.75rem]" />
      ))}
    </colgroup>
  )

  return (
    <div
      className="relative w-full min-w-0"
      aria-busy="true"
      aria-label="Chargement des réclamations"
    >
      <div
        ref={headerScrollRef}
        onScroll={onHeaderScroll}
        className="bg-background sticky top-0 z-10 w-full min-w-0 scrollbar-none overflow-x-auto"
      >
        <table className={boardTableClassName} style={{ width: tableWidth }}>
          {colgroup()}
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.name} variant="board" className="relative text-start">
                  <Skeleton className="h-3 w-3/4" aria-hidden />
                  <span className="sr-only">{resolveTicketColumnLabel(col.name, settings)}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </table>
      </div>

      <div ref={bodyScrollRef} onScroll={onBodyScroll} className="w-full min-w-0 overflow-x-auto">
        <table className={boardTableClassName} style={{ width: tableWidth }}>
          {colgroup()}
          <tbody>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell
                    key={col.name}
                    variant="board"
                    className="max-w-0 overflow-hidden text-start"
                  >
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

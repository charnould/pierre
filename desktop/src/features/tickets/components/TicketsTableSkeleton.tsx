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
  const tableWidth = Math.max(columns.length, 1) * COLUMN_WIDTH

  const colgroup = () => (
    <colgroup>
      {columns.map((col) => (
        <col key={col.name} style={{ width: COLUMN_WIDTH }} />
      ))}
    </colgroup>
  )

  return (
    <div
      className="relative w-full min-w-0"
      aria-busy="true"
      aria-label="Chargement des réclamations"
    >
      <div className="bg-background overflow-x-auto">
        <table
          className="table-fixed caption-bottom font-sans text-[0.8125rem] leading-5 tabular-nums"
          style={{ width: tableWidth }}
        >
          {colgroup()}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.name}
                  className="border-border bg-background relative h-9 border-b px-2 text-start"
                >
                  <Skeleton className="h-3 w-3/4" aria-hidden />
                  <span className="sr-only">{resolveTicketColumnLabel(col.name, settings)}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table
          className="table-fixed caption-bottom font-sans text-[0.8125rem] leading-5 tabular-nums"
          style={{ width: tableWidth }}
        >
          {colgroup()}
          <tbody>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell key={col.name} className="max-w-0 overflow-hidden text-start">
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

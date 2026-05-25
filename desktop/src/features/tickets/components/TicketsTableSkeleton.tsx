import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { TicketsColumnMeta } from '@/shared/types'

import { SKELETON_CELL_WIDTH_CLASS } from './tickets-table-skeleton-columns'

const SKELETON_ROW_COUNT = 8

interface Props {
  columns: TicketsColumnMeta[]
  settings?: UiSettings
}

export function TicketsTableSkeleton({ columns, settings }: Props) {
  return (
    <div
      className="tickets-data-table flex h-full min-h-0 flex-1 flex-col overflow-auto pb-20"
      aria-busy="true"
      aria-label="Chargement des réclamations"
    >
      <Table
        noWrapper
        fixedLayout
        className="border-border w-full border-separate border-spacing-0"
      >
        <TableHeader className="bg-background [&_th]:border-border sticky top-0 z-10 [&_tr]:border-0">
          <TableRow className="border-0 hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.name} className="border-border h-8 border-r border-b px-2 py-0">
                <Skeleton className="h-4 w-24 max-w-full" aria-hidden />
                <span className="sr-only">{resolveTicketColumnLabel(col.name, settings)}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-transparent">
              {columns.map((col, colIndex) => (
                <TableCell key={col.name} className="border-border border-r border-b px-2 py-[5px]">
                  <Skeleton
                    className={`h-4 ${SKELETON_CELL_WIDTH_CLASS[colIndex % SKELETON_CELL_WIDTH_CLASS.length]}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

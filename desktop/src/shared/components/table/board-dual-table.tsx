import {
  flexRender,
  type Header,
  type HeaderGroup,
  type Row,
  type RowData
} from '@tanstack/react-table'
import type { ReactNode, RefObject } from 'react'

import { TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

import type { AnyPierreHeader } from './column-header-options-menu'
import { ColumnResizeHandle } from './column-resize-handle'
import type { PierreTableFeatures } from './table-features'
import { useSyncedHorizontalScroll } from './use-synced-horizontal-scroll'
import { VirtualizedTableBody } from './VirtualizedTableBody'

interface RowMeta {
  index: number
  measureRef: (node: Element | null) => void
}

interface Props<TData extends RowData> {
  headerGroups: HeaderGroup<PierreTableFeatures, TData>[]
  leafHeaders: Header<PierreTableFeatures, TData, unknown>[]
  rows: Row<PierreTableFeatures, TData>[]
  scrollRef: RefObject<HTMLElement | null>
  emptyMessage: string
  renderRow: (row: Row<PierreTableFeatures, TData>, meta: RowMeta) => ReactNode
}

const tableClassName =
  'table-fixed caption-bottom font-sans text-[0.8125rem] leading-5 tabular-nums'

export function BoardDualTable<TData extends RowData>({
  headerGroups,
  leafHeaders,
  rows,
  scrollRef,
  emptyMessage,
  renderRow
}: Props<TData>) {
  const { headerScrollRef, bodyScrollRef, onHeaderScroll, onBodyScroll } =
    useSyncedHorizontalScroll()
  const tableWidth = leafHeaders.reduce((sum, header) => sum + header.getSize(), 0)
  const colgroup = (
    <colgroup>
      {leafHeaders.map((header) => (
        <col key={header.id} style={{ width: header.getSize() }} />
      ))}
    </colgroup>
  )

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={headerScrollRef}
        onScroll={onHeaderScroll}
        className="bg-background sticky z-10 scrollbar-none overflow-x-auto"
        style={{ top: 'var(--board-table-section-height, 0px)' }}
      >
        <table className={tableClassName} style={{ width: tableWidth }}>
          {colgroup}
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="border-border bg-background relative h-8 border-b px-2 text-start"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    <ColumnResizeHandle header={header as AnyPierreHeader} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </table>
      </div>

      <div ref={bodyScrollRef} onScroll={onBodyScroll} className="overflow-x-auto">
        <table className={tableClassName} style={{ width: tableWidth }}>
          {colgroup}
          <VirtualizedTableBody
            rows={rows}
            scrollRef={scrollRef}
            columnCount={leafHeaders.length}
            estimateSize={32}
            emptyMessage={emptyMessage}
            renderRow={renderRow}
          />
        </table>
      </div>
    </div>
  )
}

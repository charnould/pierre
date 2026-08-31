import { useVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { TableBody, TableCell, TableRow } from '@/shared/components/ui/table'

const DEFAULT_ESTIMATE_SIZE = 40
const DEFAULT_OVERSCAN = 8

interface VirtualRowMeta {
  index: number
  measureRef: (node: Element | null) => void
}

interface Props<Row> {
  rows: Row[]
  scrollRef: RefObject<HTMLElement | null>
  columnCount: number
  estimateSize?: number
  overscan?: number
  emptyMessage?: string
  renderRow: (row: Row, meta: VirtualRowMeta) => ReactNode
}

function listOffsetInScroller(tbody: HTMLElement, scrollEl: HTMLElement) {
  return (
    tbody.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop
  )
}

export function VirtualizedTableBody<Row>({
  rows,
  scrollRef,
  columnCount,
  estimateSize = DEFAULT_ESTIMATE_SIZE,
  overscan = DEFAULT_OVERSCAN,
  emptyMessage = 'Aucune donnée.',
  renderRow
}: Props<Row>) {
  'use no memo'
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null)
  const [tbodyEl, setTbodyEl] = useState<HTMLTableSectionElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  const bindTbody = (node: HTMLTableSectionElement | null) => {
    tbodyRef.current = node
    setTbodyEl((prev) => (prev === node ? prev : node))
  }

  // TanStack Virtual is incompatible with React Compiler (useVirtualizer).
  // oxlint-disable-next-line react/incompatible-library -- virtualizer owns its own subscriptions
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin
  })

  const virtualRows = rows.length === 0 ? [] : virtualizer.getVirtualItems()
  const paddingTop =
    virtualRows.length > 0 ? Math.max(0, (virtualRows[0]?.start ?? 0) - scrollMargin) : 0
  const paddingBottom =
    virtualRows.length > 0
      ? Math.max(
          0,
          virtualizer.getTotalSize() +
            scrollMargin -
            (virtualRows[virtualRows.length - 1]?.end ?? 0)
        )
      : 0

  useLayoutEffect(() => {
    const tbody = tbodyEl
    const scrollEl = scrollRef.current
    if (!tbody || !scrollEl) return

    const updateMargin = () => {
      const live = tbodyRef.current
      const scroller = scrollRef.current
      if (!live || !scroller || !live.isConnected) return
      const next = listOffsetInScroller(live, scroller)
      if (!Number.isFinite(next)) return
      setScrollMargin((prev) => (Math.abs(prev - next) < 1 ? prev : next))
    }

    updateMargin()
    const ro = new ResizeObserver(updateMargin)
    ro.observe(tbody)
    const section = tbody.closest('section')
    if (section) ro.observe(section)
    scrollEl.addEventListener('scroll', updateMargin, { passive: true })
    return () => {
      ro.disconnect()
      scrollEl.removeEventListener('scroll', updateMargin)
    }
  }, [tbodyEl, rows.length, scrollRef])

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columnCount} className="text-center">
            {emptyMessage}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody ref={bindTbody}>
      {paddingTop > 0 ? (
        <TableRow aria-hidden className="hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-0" style={{ height: paddingTop }} />
        </TableRow>
      ) : null}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index]
        if (!row) return null
        return renderRow(row, {
          index: virtualRow.index,
          measureRef: (node) => {
            if (node) virtualizer.measureElement(node)
          }
        })
      })}
      {paddingBottom > 0 ? (
        <TableRow aria-hidden className="hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-0" style={{ height: paddingBottom }} />
        </TableRow>
      ) : null}
    </TableBody>
  )
}

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Column } from '@tanstack/react-table'

import { useColumnDragContext } from '@/shared/components/ui/column-drag-context'
import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import type { TicketRow } from '@/shared/types'

import { TicketColumnFilter } from './TicketColumnFilter'

interface Props {
  column: Column<TicketRow, unknown>
  title: string
  columnName: string
  url?: string
  columnFilters?: ColumnFilters
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  enableColumnDnD?: boolean
}

export const TICKETS_COLUMN_HEADER_TITLE_CLASS =
  'block truncate px-1 text-[10px] font-medium tracking-[0.06em] text-foreground uppercase'

export function TicketsColumnHeader({
  column,
  title,
  columnName,
  url,
  columnFilters,
  onColumnFiltersChange,
  enableColumnDnD = false
}: Props) {
  const selectedFilters = columnFilters?.[columnName] ?? []
  const sorted = column.getIsSorted()
  const hasActiveFilter = selectedFilters.length > 0
  const showActions = sorted || hasActiveFilter
  const dragContext = useColumnDragContext()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: column.id,
    disabled: !enableColumnDnD,
    data: { title }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const canDrop = dragContext?.canDropOn(column.id) ?? false
  const insertEdge = dragContext?.getInsertEdge(column.id) ?? null
  const showInvalidOver = isOver && dragContext?.isDragging && !canDrop
  const showValidOver = isOver && dragContext?.isDragging && canDrop

  const titleLabel = (
    <span
      className={TICKETS_COLUMN_HEADER_TITLE_CLASS}
      title={enableColumnDnD ? 'Glissez pour déplacer cette colonne' : title}
    >
      {title}
    </span>
  )

  const actions =
    url && onColumnFiltersChange ? (
      <div
        className={cn(
          'flex shrink-0 items-center transition-opacity duration-150',
          showActions ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
        )}
      >
        <TicketColumnFilter
          url={url}
          column={columnName}
          columnLabel={title}
          selected={selectedFilters}
          compact
          enableColorize
          sortColumn={column}
          onChange={(values) => {
            const next = { ...columnFilters }
            if (values.length === 0) delete next[columnName]
            else next[columnName] = values
            onColumnFiltersChange(next)
          }}
        />
      </div>
    ) : null

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="border-primary/50 bg-primary/5 relative flex h-7 w-full min-w-0 items-center justify-center rounded-sm border border-dashed px-0.5"
      >
        <span className="text-foreground text-[10px] tracking-wide uppercase">Déplacée</span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/header relative flex w-full min-w-0 items-center pr-0.5',
        showValidOver && 'bg-primary/5',
        showInvalidOver && 'bg-destructive/10'
      )}
    >
      {showValidOver && insertEdge === 'left' ? (
        <span className="bg-primary pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-0.5" />
      ) : null}
      {showValidOver && insertEdge === 'right' ? (
        <span className="bg-primary pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-0.5" />
      ) : null}
      {showInvalidOver ? (
        <span className="bg-destructive pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-0.5" />
      ) : null}

      {enableColumnDnD ? (
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="min-w-0 flex-1 touch-none"
          aria-label={`Réordonner ${title}`}
        >
          <div className="hover:bg-muted/40 cursor-grab rounded-sm active:cursor-grabbing">
            {titleLabel}
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1">{titleLabel}</div>
      )}
      {actions}
    </div>
  )
}

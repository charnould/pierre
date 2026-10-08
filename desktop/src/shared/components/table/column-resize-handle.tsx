import { cn } from '@/shared/lib/utils'

import type { AnyPierreHeader } from './column-header-options-menu'

interface Props {
  header: AnyPierreHeader
}

export function ColumnResizeHandle({ header }: Props) {
  if (!header.column.getCanResize()) return null

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner la colonne"
      onMouseDown={(event) => {
        event.stopPropagation()
        header.getResizeHandler()(event)
      }}
      onTouchStart={(event) => {
        event.stopPropagation()
        header.getResizeHandler()(event)
      }}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none select-none',
        'before:bg-border before:absolute before:inset-y-1 before:left-1/2 before:w-px before:-translate-x-1/2',
        'hover:before:bg-foreground/40 active:before:bg-foreground',
        header.column.getIsResizing() && 'before:bg-foreground'
      )}
    />
  )
}

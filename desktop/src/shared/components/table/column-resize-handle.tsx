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
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={cn(
        'absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize touch-none select-none',
        'hover:bg-foreground/20 active:bg-foreground/30',
        header.column.getIsResizing() && 'bg-foreground/30'
      )}
    />
  )
}

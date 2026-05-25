import { cn } from '@/shared/lib/utils'

type Props = {
  pinnedWidth: number
  scrollWidth: number
  activeIsPinned: boolean
  overIsPinned: boolean | null
  hasOver: boolean
}

export function ColumnDragZoneBanners({
  pinnedWidth,
  scrollWidth,
  activeIsPinned,
  overIsPinned,
  hasOver
}: Props) {
  const crossZoneHover = hasOver && overIsPinned !== null && activeIsPinned !== overIsPinned
  const pinnedInvalid = crossZoneHover && !activeIsPinned
  const scrollInvalid = crossZoneHover && activeIsPinned

  if (pinnedWidth === 0 && scrollWidth === 0) return null

  return (
    <div
      className="border-border pointer-events-none absolute top-0 left-0 z-30 flex h-7 border-b"
      style={{ minWidth: pinnedWidth + scrollWidth }}
    >
      {pinnedWidth > 0 ? (
        <div
          className={cn(
            'flex items-center justify-center border-r border-border px-2 text-xs font-medium',
            pinnedInvalid ? 'bg-destructive/15 text-destructive' : 'bg-primary/5 text-primary'
          )}
          style={{ width: pinnedWidth }}
        >
          Colonnes fixées
        </div>
      ) : null}
      {scrollWidth > 0 ? (
        <div
          className={cn(
            'flex flex-1 items-center justify-center px-2 text-xs font-medium',
            scrollInvalid
              ? 'bg-destructive/15 text-destructive'
              : 'bg-muted/60 text-muted-foreground'
          )}
          style={{ width: scrollWidth, minWidth: scrollWidth }}
        >
          Colonnes défilantes
        </div>
      ) : null}
    </div>
  )
}

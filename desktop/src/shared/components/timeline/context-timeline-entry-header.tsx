import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  title: ReactNode
  dateTime: string
  dateLabel: string
  /** Absolute date for hover when `dateLabel` is relative. */
  dateTitle?: string
  /** Allow L1 to wrap — used by todo sentences with inline chips. */
  wrap?: boolean
  /** Inbox-only folder line under the date (`Impayés · cli-…`). */
  context?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Drawer timeline header: L1 date + optional meta → L2 action title (aligned on avatar band).
 */
export function ContextTimelineEntryHeader({
  title,
  dateTime,
  dateLabel,
  dateTitle,
  wrap = false,
  context,
  children,
  className
}: Props) {
  const TitleTag = wrap ? 'div' : 'p'
  return (
    <div className={cn('flex min-w-0 flex-col gap-0', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <time className="pierre-meta tabular-nums" dateTime={dateTime} title={dateTitle}>
          {dateLabel}
        </time>
        {children}
      </div>
      {context != null ? <p className="pierre-meta min-w-0">{context}</p> : null}
      <TitleTag
        className={cn(
          'text-foreground flex min-h-4 text-xs leading-4 font-medium',
          wrap ? 'min-w-0 flex-wrap items-center gap-x-1 gap-y-1' : 'items-center truncate'
        )}
      >
        {title}
      </TitleTag>
    </div>
  )
}

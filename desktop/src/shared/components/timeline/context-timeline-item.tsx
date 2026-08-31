import type { KeyboardEvent, ReactNode } from 'react'

import {
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator
} from '@/shared/components/reui/timeline'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'

import { TimelineActorAvatar } from './timeline-actor-avatar'
import {
  TIMELINE_INDICATOR_CLASS,
  TIMELINE_ITEM_OFFSET_CLASS,
  TIMELINE_SEPARATOR_CLASS
} from './timeline-layout'

interface Props {
  step: number
  actor: ParsedActivityAuthor
  /** Header stack (action title / date) in the content column. */
  header?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  'data-timeline-id'?: string
  'data-activity-id'?: string | number
  onActivate?: () => void
}

/**
 * ReUI c-timeline-11 composition: Separator + Indicator(Avatar) in Header, body in Content.
 */
export function ContextTimelineItem({
  step,
  actor,
  header,
  children,
  className,
  contentClassName,
  'data-timeline-id': dataTimelineId,
  'data-activity-id': dataActivityId,
  onActivate
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onActivate || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onActivate()
  }

  return (
    <TimelineItem
      step={step}
      className={cn(
        TIMELINE_ITEM_OFFSET_CLASS,
        // Kill ReUI `gap-0.5`: header is out-of-flow (absolute avatar), so the gap
        // alone pushed the date 2px below the avatar center line.
        'gap-0 group-data-[orientation=vertical]/timeline:not-last:pb-4',
        onActivate &&
          'cursor-pointer focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none',
        className
      )}
      data-timeline-id={dataTimelineId}
      data-activity-id={dataActivityId}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={onActivate ? handleKeyDown : undefined}
    >
      <TimelineHeader className="contents">
        <TimelineSeparator className={TIMELINE_SEPARATOR_CLASS} />
        <TimelineIndicator aria-hidden={false} className={TIMELINE_INDICATOR_CLASS}>
          <TimelineActorAvatar actor={actor} size="default" />
        </TimelineIndicator>
      </TimelineHeader>
      {(header != null || children != null) && (
        <TimelineContent className={cn('text-foreground mt-0 p-0', contentClassName)}>
          {header}
          {children != null && header != null ? <div className="mt-2">{children}</div> : children}
        </TimelineContent>
      )}
    </TimelineItem>
  )
}

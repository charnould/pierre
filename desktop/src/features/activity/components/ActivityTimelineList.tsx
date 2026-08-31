import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { ActivityTimelineEvent } from '@/features/repayment/components/ActivityTimelineEvent'
import { indexTodoRevisions } from '@/features/repayment/lib/repayment-action-activity'
import { CartoonNotificationGrouped } from '@/shared/components/icons/koboyo-empty'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'

function ListSentinel({
  enabled,
  onVisible,
  rootRef
}: {
  enabled: boolean
  onVisible: () => void
  rootRef: RefObject<HTMLDivElement | null>
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible()
      },
      { root, rootMargin: '120px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, onVisible, rootRef])

  return <div ref={sentinelRef} data-activity-list-sentinel="" aria-hidden className="h-px" />
}

export function ActivityTimelineList({
  items,
  emptyCopy,
  onOpen,
  onLoadMore,
  hasMore = false,
  loadMoreEnabled = false
}: {
  items: ActivityNotificationItem[]
  emptyCopy: { title: string; description: string }
  onOpen: (item: ActivityNotificationItem) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadMoreEnabled?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const handleLoadMore = useCallback(() => {
    onLoadMore?.()
  }, [onLoadMore])
  const revisions = useMemo(
    () => indexTodoRevisions(items.flatMap((item) => (item.row ? [item.row] : []))),
    [items]
  )

  return (
    <div ref={scrollRef} className="scroll-fade min-h-0 flex-1 overflow-y-auto">
      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CartoonNotificationGrouped />
            </EmptyMedia>
            <EmptyTitle>{emptyCopy.title}</EmptyTitle>
            <EmptyDescription>{emptyCopy.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ContextTimeline defaultValue={items.length} className="activity-motion-list">
            {items.map((item, index) => {
              if (!item.row) return null
              return (
                <ActivityTimelineEvent
                  key={`${item.source}:${item.id}`}
                  row={item.row}
                  actor={parseActivityAuthor(item.row.auteur)}
                  step={index + 1}
                  dateTime={item.row.date_creation}
                  dateLabel={formatInspectorTimelineDateline(item.row.date_creation)}
                  revisions={revisions}
                  dataTimelineId={`${item.source}:${item.id}`}
                  dataActivityId={item.row.id}
                  headerExtra={[item.moduleLabel, item.ref].filter(Boolean).join(' · ')}
                  onActivate={item.target ? () => onOpen(item) : undefined}
                />
              )
            })}
          </ContextTimeline>
          {onLoadMore ? (
            <ListSentinel
              enabled={loadMoreEnabled && hasMore}
              onVisible={handleLoadMore}
              rootRef={scrollRef}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

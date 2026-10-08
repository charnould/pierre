import { type ReactNode, type RefObject, useCallback, useEffect, useRef } from 'react'

import { localTodayIso, partitionHomeActions } from '@/features/home/home-open-action-buckets'
import { formatDebutBailDisplay } from '@/features/repayment/lib/format-debut-bail'
import { OpenActionRow } from '@/shared/components/inspector/open-actions-card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import { cn } from '@/shared/lib/utils'

function formatHomeDue(value: string): string {
  return formatDebutBailDisplay(value) ?? value
}

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

function HomeActionButton({
  action,
  onOpen
}: {
  action: ActionActivity
  onOpen: (action: ActionActivity) => void
}) {
  return (
    <button
      type="button"
      className="hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/20 border-border/80 w-full min-w-0 rounded-md border px-3 py-2 text-start outline-none focus-visible:ring-2"
      onClick={() => onOpen(action)}
    >
      <OpenActionRow
        title={action.contenu.task.title}
        auteur={action.createdBy}
        assigneA={action.contenu.task.assignee?.id ?? ''}
        dateEcheance={action.contenu.task.due_date ?? ''}
        note={action.contenu.note}
        formatDate={formatHomeDue}
      />
    </button>
  )
}

function HomeActionBucketList({
  title,
  actions,
  onOpen
}: {
  title: string
  actions: ActionActivity[]
  onOpen: (action: ActionActivity) => void
}) {
  if (actions.length === 0) return null
  return (
    <section>
      <h3 className="text-muted-foreground pt-2 text-sm leading-5 font-medium">{title}</h3>
      <ul className="flex flex-col gap-2">
        {actions.map((action) => (
          <li key={action.row.id}>
            <HomeActionButton action={action} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HomeActionBuckets({
  actions,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  fit = false,
  onOpen,
  onLoadMore,
  hasMore = false,
  loadMoreEnabled = false
}: {
  actions: ActionActivity[]
  emptyTitle: string
  emptyDescription: string
  emptyIcon: ReactNode
  fit?: boolean
  onOpen: (action: ActionActivity) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadMoreEnabled?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const handleLoadMore = useCallback(() => {
    onLoadMore?.()
  }, [onLoadMore])
  const { overdue, upcoming } = partitionHomeActions(actions, localTodayIso())
  if (overdue.length === 0 && upcoming.length === 0) {
    const empty = (
      <Empty className={fit ? 'flex-none' : undefined}>
        <EmptyHeader>
          <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
          <EmptyTitle size={fit ? 'sm' : 'default'}>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
    return fit ? empty : <div className="flex min-h-0 flex-1 px-6">{empty}</div>
  }
  return (
    <div
      ref={scrollRef}
      className={cn(
        fit ? 'overflow-visible' : 'scroll-fade min-h-0 flex-1 overflow-y-auto px-6 pb-4'
      )}
    >
      <HomeActionBucketList title="En retard" actions={overdue} onOpen={onOpen} />
      <HomeActionBucketList title="Prochaines" actions={upcoming} onOpen={onOpen} />
      {onLoadMore ? (
        <ListSentinel
          enabled={loadMoreEnabled && hasMore}
          onVisible={handleLoadMore}
          rootRef={scrollRef}
        />
      ) : null}
    </div>
  )
}

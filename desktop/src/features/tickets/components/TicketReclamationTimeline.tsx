import { LoaderCircle } from 'lucide-react'
import { memo, useMemo } from 'react'

import { EmptyFolder } from '@/shared/components/icons/koboyo-empty'
import { ActivityTimelineEvent } from '@/shared/components/timeline/activity-timeline-event'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { TimelineEventActions } from '@/shared/components/timeline/timeline-event-actions'
import { TIMELINE_CONTENT_INSET_CLASS } from '@/shared/components/timeline/timeline-layout'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/components/ui/empty'
import { indexTodoRevisions } from '@/shared/lib/activities/action-activity'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'

import type { TicketTimelineItem } from '../lib/build-ticket-timeline'

interface Props {
  items: TicketTimelineItem[]
  loading?: boolean
  highlightId?: number
  embedded?: boolean
  userLogin: string
  onStartReply?: (activityId: number, auteur: string) => void
  onStartEditNote?: (row: TicketTimelineItem['row']) => void
  onDeleteActivity?: (id: number) => void
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
}

function TimelineItems({
  items,
  highlightId,
  stepOffset = 0,
  userLogin,
  onStartReply,
  onStartEditNote,
  onDeleteActivity,
  onReopenAction
}: {
  items: TicketTimelineItem[]
  highlightId?: number
  stepOffset?: number
  userLogin: string
  onStartReply?: (activityId: number, auteur: string) => void
  onStartEditNote?: (row: TicketTimelineItem['row']) => void
  onDeleteActivity?: (id: number) => void
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
}) {
  const revisions = useMemo(() => indexTodoRevisions(items.map((item) => item.row)), [items])
  const latestActionEventIds = useMemo(() => {
    const latestByThread = new Map<string, { id: number; revision: number }>()
    for (const item of items) {
      const row = item.row
      if (!row.type.startsWith('task.') || !row.thread_id) continue
      const revision = row.revision ?? 0
      const current = latestByThread.get(row.thread_id)
      if (!current || revision > current.revision) {
        latestByThread.set(row.thread_id, { id: row.id, revision })
      }
    }
    return new Set([...latestByThread.values()].map((entry) => entry.id))
  }, [items])

  return (
    <>
      {items.map((item, index) => {
        const actor = parseActivityAuthor(item.row.auteur)
        const canReply = item.row.type === 'note.published' && onStartReply != null
        const authorLogin = actor.id.split('@')[0]?.toLowerCase()
        const currentLogin = userLogin
          .replace(/^user:/, '')
          .split('@')[0]
          ?.toLowerCase()
        const canManageNote =
          item.row.type.startsWith('note.') &&
          authorLogin === currentLogin &&
          item.source === 'activity'

        return (
          <ActivityTimelineEvent
            key={item.id}
            row={item.row}
            actor={actor}
            step={stepOffset + index + 1}
            dateTime={item.row.date_creation}
            dateLabel={formatInspectorTimelineDateline(item.row.date_creation)}
            statuses={item.statuses}
            revisions={revisions}
            highlight={highlightId === item.row.id}
            expandable
            dataTimelineId={item.id}
            dataActivityId={item.row.id}
            userLogin={userLogin}
            onReopenAction={onReopenAction}
            currentActionEvent={latestActionEventIds.has(item.row.id)}
            body={undefined}
          >
            {canReply ? (
              <TimelineEventActions
                onStartReply={() => onStartReply(item.row.id, item.row.auteur)}
                onEdit={
                  canManageNote && onStartEditNote ? () => onStartEditNote(item.row) : undefined
                }
                onDelete={
                  canManageNote && onDeleteActivity
                    ? () => onDeleteActivity(item.row.id)
                    : undefined
                }
              />
            ) : null}
          </ActivityTimelineEvent>
        )
      })}
    </>
  )
}

export const TicketReclamationTimeline = memo(function TicketReclamationTimeline({
  items,
  loading,
  highlightId,
  embedded = false,
  userLogin,
  onStartReply,
  onStartEditNote,
  onDeleteActivity,
  onReopenAction
}: Props) {
  if (embedded) {
    if (loading && items.length === 0) {
      return (
        <p className={cn('text-muted-foreground py-1 text-sm', TIMELINE_CONTENT_INSET_CLASS)}>
          Chargement…
        </p>
      )
    }
    if (items.length === 0) return null
    return (
      <TimelineItems
        items={items}
        highlightId={highlightId}
        userLogin={userLogin}
        onStartReply={onStartReply}
        onStartEditNote={onStartEditNote}
        onDeleteActivity={onDeleteActivity}
        onReopenAction={onReopenAction}
      />
    )
  }

  if (loading && items.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LoaderCircle />
          </EmptyMedia>
          <EmptyTitle size="sm">Chargement…</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (items.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <EmptyFolder />
          </EmptyMedia>
          <EmptyTitle size="sm">Aucun historique pour ce dossier.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ContextTimeline defaultValue={items.length}>
      <TimelineItems
        items={items}
        highlightId={highlightId}
        userLogin={userLogin}
        onStartReply={onStartReply}
        onStartEditNote={onStartEditNote}
        onDeleteActivity={onDeleteActivity}
        onReopenAction={onReopenAction}
      />
    </ContextTimeline>
  )
})

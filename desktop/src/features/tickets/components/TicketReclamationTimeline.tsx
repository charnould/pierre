import { LoaderCircle } from 'lucide-react'
import { memo, useMemo } from 'react'

import { ActivityTimelineEvent } from '@/features/repayment/components/ActivityTimelineEvent'
import { indexTodoRevisions } from '@/features/repayment/lib/repayment-action-activity'
import { EmptyFolder } from '@/shared/components/icons/koboyo-empty'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { TIMELINE_CONTENT_INSET_CLASS } from '@/shared/components/timeline/timeline-layout'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/components/ui/empty'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'

import type { TicketTimelineItem } from '../lib/build-ticket-timeline'
import { NoteReplyDraft } from './NoteReplyDraft'

interface Props {
  items: TicketTimelineItem[]
  loading?: boolean
  highlightId?: number
  embedded?: boolean
  onStartReply?: (activityId: number, auteur: string) => void
}

function TimelineItems({
  items,
  highlightId,
  stepOffset = 0,
  onStartReply
}: {
  items: TicketTimelineItem[]
  highlightId?: number
  stepOffset?: number
  onStartReply?: (activityId: number, auteur: string) => void
}) {
  const revisions = useMemo(() => indexTodoRevisions(items.map((item) => item.row)), [items])

  return (
    <>
      {items.map((item, index) => {
        const actor = parseActivityAuthor(item.row.auteur)
        const canReply = item.row.type === 'note' && onStartReply != null

        return (
          <ActivityTimelineEvent
            key={item.id}
            row={item.row}
            actor={actor}
            step={stepOffset + index + 1}
            dateTime={item.row.date_creation}
            dateLabel={formatInspectorTimelineDateline(item.row.date_creation)}
            revisions={revisions}
            highlight={highlightId === item.row.id}
            dataTimelineId={item.id}
            dataActivityId={item.row.id}
          >
            {canReply ? (
              <NoteReplyDraft onStartReply={() => onStartReply(item.row.id, item.row.auteur)} />
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
  onStartReply
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
    return <TimelineItems items={items} highlightId={highlightId} onStartReply={onStartReply} />
  }

  if (loading && items.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LoaderCircle />
          </EmptyMedia>
          <EmptyTitle className="text-sm leading-5 font-medium">Chargement…</EmptyTitle>
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
          <EmptyTitle className="text-sm leading-5 font-medium">
            Aucun historique pour ce dossier.
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ContextTimeline defaultValue={items.length}>
      <TimelineItems items={items} highlightId={highlightId} onStartReply={onStartReply} />
    </ContextTimeline>
  )
})

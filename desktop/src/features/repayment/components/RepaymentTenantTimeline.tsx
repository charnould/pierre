import { memo, useMemo, type ReactNode } from 'react'

import { ActivityBoostControl } from '@/features/activity/components/ActivityBoostControl'
import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import { ContextTimelineEntryHeader } from '@/shared/components/timeline/context-timeline-entry-header'
import { ContextTimelineItem } from '@/shared/components/timeline/context-timeline-item'
import { TimelineEventActions } from '@/shared/components/timeline/timeline-event-actions'
import { Button } from '@/shared/components/ui/button'
import { indexTodoRevisions, parseActionActivity } from '@/shared/lib/activities/action-activity'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import {
  databaseTimelineActor,
  parseActivityAuthor
} from '@/shared/lib/timeline/parse-activity-author'
import { TIMELINE_MOVEMENT_TITLE } from '@/shared/lib/timeline/timeline-action-label'
import type { Activite } from '@/shared/types/activites'

import type { RepaymentTimelineItem } from '../lib/build-repayment-timeline'
import { RepaymentActivityTimelineEvent } from './RepaymentActivityTimelineEvent'
import { RepaymentTimelineMovementRow } from './RepaymentTimelineMovementRow'

interface Props {
  items: RepaymentTimelineItem[]
  journal?: Activite[]
  highlightId?: number
  userLogin?: string
  onEditPlan?: (row: Activite) => void
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  onStartReply?: (activityId: number, auteur: string) => void
  onStartEditNote?: (row: Activite) => void
  onDeleteNote?: (id: number) => void
  onBoost?: (id: number, emoji: ActivityBoostEmoji | null) => void | Promise<void>
}

function MovementHeader({
  item
}: {
  item: Extract<RepaymentTimelineItem, { source: 'movement' }>
}) {
  const date = typeof item.row.date_exigibilite === 'string' ? item.row.date_exigibilite : ''

  return (
    <ContextTimelineEntryHeader
      title={TIMELINE_MOVEMENT_TITLE}
      dateTime={date}
      dateLabel={date ? formatInspectorTimelineDateline(date) : '—'}
    />
  )
}

function ActivityActionsRow({ boost, actions }: { boost: ReactNode; actions?: ReactNode }) {
  if (!boost && !actions) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {boost}
      {actions}
    </div>
  )
}

function activityBoostControl(
  row: Activite,
  userLogin: string | undefined,
  onBoost: ((id: number, emoji: ActivityBoostEmoji | null) => void | Promise<void>) | undefined
) {
  if (!userLogin || !onBoost) return null
  return (
    <ActivityBoostControl
      activity={row}
      currentUser={userLogin}
      onBoost={(emoji) => onBoost(row.id, emoji)}
    />
  )
}

function TimelineNoteActions({
  isAuthor,
  onStartReply,
  onStartEdit,
  onDelete,
  boost
}: {
  isAuthor: boolean
  onStartReply?: () => void
  onStartEdit?: () => void
  onDelete?: () => void
  boost?: ReactNode
}) {
  return (
    <ActivityActionsRow
      boost={boost}
      actions={
        onStartReply ? (
          <TimelineEventActions
            className="mt-0"
            onStartReply={onStartReply}
            onEdit={isAuthor ? onStartEdit : undefined}
            onDelete={isAuthor ? onDelete : undefined}
          />
        ) : undefined
      }
    />
  )
}

function TimelineItems({
  items,
  journal,
  highlightId,
  userLogin,
  onEditPlan,
  savingAction,
  onReopenAction,
  stepOffset = 0,
  onStartReply,
  onStartEditNote,
  onDeleteNote,
  onBoost
}: {
  items: RepaymentTimelineItem[]
  journal?: Activite[]
  highlightId?: number
  userLogin?: string
  onEditPlan?: (row: Activite) => void
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  stepOffset?: number
  onStartReply?: (activityId: number, auteur: string) => void
  onStartEditNote?: (row: Activite) => void
  onDeleteNote?: (id: number) => void
  onBoost?: (id: number, emoji: ActivityBoostEmoji | null) => void | Promise<void>
}) {
  const todoRevisions = useMemo(
    () =>
      indexTodoRevisions([
        ...(journal ?? []),
        ...items.flatMap((item) => (item.source === 'activity' ? [item.row] : []))
      ]),
    [items, journal]
  )

  const latestActionEventIds = useMemo(() => {
    const latest = new Map<string, { id: number; revision: number }>()
    for (const item of items) {
      if (
        item.source !== 'activity' ||
        !item.row.type.startsWith('task.') ||
        !item.row.thread_id ||
        item.row.revision == null
      ) {
        continue
      }
      const current = latest.get(item.row.thread_id)
      if (!current || item.row.revision > current.revision) {
        latest.set(item.row.thread_id, { id: item.row.id, revision: item.row.revision })
      }
    }
    return new Set([...latest.values()].map((entry) => entry.id))
  }, [items])

  return (
    <>
      {items.map((item, index) => {
        const actor =
          item.source === 'movement'
            ? databaseTimelineActor()
            : parseActivityAuthor(item.row.auteur)
        const isNote = item.source === 'activity' && item.row.type.startsWith('note.')
        const isPlan = item.source === 'activity' && item.row.type.startsWith('repayment_plan.')
        const canReply = (isNote || isPlan) && onStartReply != null
        const isAuthor = isNote && userLogin != null && item.row.auteur === `user:${userLogin}`
        const todo = item.source === 'activity' ? parseActionActivity(item.row) : null
        const isTodoCreator =
          todo != null && userLogin != null && todo.createdBy === `user:${userLogin}`

        if (item.source === 'movement') {
          return (
            <ContextTimelineItem
              key={item.id}
              step={stepOffset + index + 1}
              actor={actor}
              data-timeline-id={item.id}
              header={<MovementHeader item={item} />}
            >
              <RepaymentTimelineMovementRow
                row={item.row}
                soldeAfter={item.soldeAfter}
                soldeDelta={item.soldeDelta}
              />
            </ContextTimelineItem>
          )
        }

        return (
          <RepaymentActivityTimelineEvent
            key={item.id}
            row={item.row}
            actor={actor}
            step={stepOffset + index + 1}
            dateTime={item.date}
            dateLabel={formatInspectorTimelineDateline(item.date)}
            statuses={item.statuses}
            revisions={todoRevisions}
            highlight={highlightId === item.row.id}
            className={(isNote && canReply) || isTodoCreator ? 'group/note' : undefined}
            dataTimelineId={item.id}
            dataActivityId={item.row.id}
            expandable
            onEditPlan={onEditPlan}
            userLogin={userLogin}
            savingAction={savingAction}
            onReopenAction={onReopenAction}
            currentActionEvent={latestActionEventIds.has(item.row.id)}
          >
            {canReply ? (
              <TimelineNoteActions
                isAuthor={isAuthor}
                onStartReply={() => onStartReply(item.row.id, item.row.auteur)}
                onStartEdit={
                  isAuthor && onStartEditNote ? () => onStartEditNote(item.row) : undefined
                }
                onDelete={isAuthor && onDeleteNote ? () => onDeleteNote(item.row.id) : undefined}
                boost={activityBoostControl(item.row, userLogin, onBoost)}
              />
            ) : null}
            {canReply ? null : (
              <ActivityActionsRow
                boost={activityBoostControl(item.row, userLogin, onBoost)}
                actions={
                  isTodoCreator && onDeleteNote ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="w-fit"
                      onClick={() => onDeleteNote(item.row.id)}
                    >
                      Supprimer la tâche
                    </Button>
                  ) : undefined
                }
              />
            )}
          </RepaymentActivityTimelineEvent>
        )
      })}
    </>
  )
}

export const RepaymentTenantTimeline = memo(function RepaymentTenantTimeline({
  items,
  journal,
  highlightId,
  userLogin,
  onEditPlan,
  savingAction,
  onReopenAction,
  onStartReply,
  onStartEditNote,
  onDeleteNote,
  onBoost
}: Props) {
  if (items.length === 0) return null

  return (
    <TimelineItems
      items={items}
      journal={journal}
      highlightId={highlightId}
      userLogin={userLogin}
      onEditPlan={onEditPlan}
      savingAction={savingAction}
      onReopenAction={onReopenAction}
      onStartReply={onStartReply}
      onStartEditNote={onStartEditNote}
      onDeleteNote={onDeleteNote}
      onBoost={onBoost}
    />
  )
})

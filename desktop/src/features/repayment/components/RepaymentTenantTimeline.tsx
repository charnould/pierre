import { memo, useMemo, type ReactNode } from 'react'

import { ActivityBoostControl } from '@/features/activity/components/ActivityBoostControl'
import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import { ContextTimelineEntryHeader } from '@/shared/components/timeline/context-timeline-entry-header'
import { ContextTimelineItem } from '@/shared/components/timeline/context-timeline-item'
import { Button } from '@/shared/components/ui/button'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import {
  databaseTimelineActor,
  parseActivityAuthor
} from '@/shared/lib/timeline/parse-activity-author'
import { TIMELINE_MOVEMENT_TITLE } from '@/shared/lib/timeline/timeline-action-label'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'

import type { RepaymentTimelineItem } from '../lib/build-repayment-timeline'
import { indexTodoRevisions, parseRepaymentActionActivity } from '../lib/repayment-action-activity'
import { ActivityTimelineEvent } from './ActivityTimelineEvent'
import { NoteCommentActions, NOTE_AUTHOR_ACTION_CLASS } from './NoteCommentActions'
import { isRepaymentPlanProposalActivity } from './RepaymentPlanProposalBody'
import { RepaymentTimelineMessageBody } from './RepaymentTimelineMessageBody'
import { RepaymentTimelineMovementRow } from './RepaymentTimelineMovementRow'

interface Props {
  items: RepaymentTimelineItem[]
  journal?: Activite[]
  columnValues?: ColumnValuesConfig
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

function TimelineNoteBody({
  row,
  onEditPlan,
  isAuthor,
  onStartReply,
  onStartEdit,
  onDelete,
  boost
}: {
  row: Activite
  onEditPlan?: (row: Activite) => void
  isAuthor: boolean
  onStartReply?: () => void
  onStartEdit?: () => void
  onDelete?: () => void
  boost?: ReactNode
}) {
  return (
    <>
      <RepaymentTimelineMessageBody row={row} onEditPlan={onEditPlan} />
      <ActivityActionsRow
        boost={boost}
        actions={
          onStartReply ? (
            <NoteCommentActions
              className="mt-0"
              onStartReply={onStartReply}
              onEdit={isAuthor ? onStartEdit : undefined}
              editNoteId={isAuthor ? row.id : undefined}
              onDelete={isAuthor ? onDelete : undefined}
            />
          ) : undefined
        }
      />
    </>
  )
}

function TimelineItems({
  items,
  journal,
  columnValues,
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
  columnValues?: ColumnValuesConfig
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
        item.row.type !== 'action' ||
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
        const isNote = item.source === 'activity' && item.row.type === 'note'
        const isPlan = item.source === 'activity' && isRepaymentPlanProposalActivity(item.row)
        const canReply = (isNote || isPlan) && onStartReply != null
        const isAuthor = isNote && userLogin != null && item.row.auteur === `user:${userLogin}`
        const todo = item.source === 'activity' ? parseRepaymentActionActivity(item.row) : null
        const isTodoCreator =
          todo != null && userLogin != null && todo.contenu.cree_par === `user:${userLogin}`

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

        const noteBody = canReply ? (
          <TimelineNoteBody
            row={item.row}
            onEditPlan={onEditPlan}
            isAuthor={isAuthor}
            onStartReply={() => onStartReply(item.row.id, item.row.auteur)}
            onStartEdit={isAuthor && onStartEditNote ? () => onStartEditNote(item.row) : undefined}
            onDelete={isAuthor && onDeleteNote ? () => onDeleteNote(item.row.id) : undefined}
            boost={activityBoostControl(item.row, userLogin, onBoost)}
          />
        ) : undefined

        return (
          <ActivityTimelineEvent
            key={item.id}
            row={item.row}
            actor={actor}
            step={stepOffset + index + 1}
            dateTime={item.date}
            dateLabel={formatInspectorTimelineDateline(item.date)}
            revisions={todoRevisions}
            columnValues={columnValues}
            highlight={highlightId === item.row.id}
            className={(isNote && canReply) || isTodoCreator ? 'group/note' : undefined}
            dataTimelineId={item.id}
            dataActivityId={item.row.id}
            body={noteBody}
            onEditPlan={onEditPlan}
            userLogin={userLogin}
            savingAction={savingAction}
            onReopenAction={onReopenAction}
            currentActionEvent={latestActionEventIds.has(item.row.id)}
          >
            {canReply ? null : (
              <ActivityActionsRow
                boost={activityBoostControl(item.row, userLogin, onBoost)}
                actions={
                  isTodoCreator && onDeleteNote ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className={cn('w-fit', NOTE_AUTHOR_ACTION_CLASS)}
                      onClick={() => onDeleteNote(item.row.id)}
                    >
                      Supprimer la tâche
                    </Button>
                  ) : undefined
                }
              />
            )}
          </ActivityTimelineEvent>
        )
      })}
    </>
  )
}

export const RepaymentTenantTimeline = memo(function RepaymentTenantTimeline({
  items,
  journal,
  columnValues,
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
      columnValues={columnValues}
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

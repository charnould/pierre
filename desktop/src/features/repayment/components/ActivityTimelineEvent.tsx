import type { ReactNode } from 'react'

import { ContextTimelineEntryHeader } from '@/shared/components/timeline/context-timeline-entry-header'
import { ContextTimelineItem } from '@/shared/components/timeline/context-timeline-item'
import { actorDisplayName } from '@/shared/components/timeline/timeline-actor-avatar'
import { TIMELINE_HIGHLIGHT_CLASS } from '@/shared/components/timeline/timeline-layout'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { timelineActivityActionVerb } from '@/shared/lib/timeline/timeline-action-label'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import { COMMUNICATION_TYPES, type Activite } from '@/shared/types/activites'

import {
  parseRepaymentActionActivity,
  previousTodoContent,
  todoTimelineSentence,
  type RepaymentActionActivity
} from '../lib/repayment-action-activity'
import {
  outboundActionSentenceParts,
  parseTimelineOutboundAction
} from '../lib/repayment-outbound-message'
import { NotificationRepaymentMeta } from './NotificationRepaymentMeta'
import {
  isRepaymentStatusChangeActivity,
  RepaymentStatusChangeSentence
} from './RepaymentStatusChangeBody'
import {
  isRepaymentTagChangeActivity,
  RepaymentTagsChangeSentence
} from './RepaymentTagsChangeBody'
import { RepaymentTimelineMessageBody } from './RepaymentTimelineMessageBody'
import { RepaymentTodoEventSentence } from './RepaymentTodoEventSentence'

interface Props {
  row: Activite
  actor: ParsedActivityAuthor
  step: number
  dateTime: string
  dateLabel: string
  revisions?: Map<string, RepaymentActionActivity>
  columnValues?: ColumnValuesConfig
  headerExtra?: ReactNode
  highlight?: boolean
  className?: string
  dataTimelineId?: string
  dataActivityId?: string | number
  onActivate?: () => void
  /** Replace the default read-only body (note edit form, drawer body + actions). */
  body?: ReactNode
  onEditPlan?: (row: Activite) => void
  userLogin?: string
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  currentActionEvent?: boolean
  children?: ReactNode
}

function ActivityTimelineEventHeader({
  row,
  actorName,
  dateTime,
  dateLabel,
  revisions,
  columnValues,
  headerExtra
}: {
  row: Activite
  actorName: string
  dateTime: string
  dateLabel: string
  revisions?: Map<string, RepaymentActionActivity>
  columnValues?: ColumnValuesConfig
  headerExtra?: ReactNode
}) {
  const parsed = parseRepaymentActionActivity(row)
  const previous =
    parsed != null && revisions
      ? previousTodoContent(revisions, parsed.threadId, parsed.revision)
      : null
  const outboundAction = parseTimelineOutboundAction(row)
  const isOutboundMessage =
    (COMMUNICATION_TYPES as readonly string[]).includes(row.type) &&
    /^(user|agent|automation|system):/.test(row.auteur)

  if (row.type === 'action') {
    return (
      <ContextTimelineEntryHeader
        wrap
        title={
          <>
            {actorName}
            {parsed ? (
              <RepaymentTodoEventSentence parts={todoTimelineSentence(parsed, previous)} />
            ) : (
              <span className="font-normal">{timelineActivityActionVerb(row)}</span>
            )}
          </>
        }
        dateTime={dateTime}
        dateLabel={dateLabel}
        context={headerExtra}
      >
        <NotificationRepaymentMeta row={row} />
      </ContextTimelineEntryHeader>
    )
  }

  if (isRepaymentStatusChangeActivity(row)) {
    return (
      <ContextTimelineEntryHeader
        wrap
        title={
          <>
            {actorName}
            <RepaymentStatusChangeSentence row={row} columnValues={columnValues} />
          </>
        }
        dateTime={dateTime}
        dateLabel={dateLabel}
        context={headerExtra}
      >
        <NotificationRepaymentMeta row={row} />
      </ContextTimelineEntryHeader>
    )
  }

  if (isRepaymentTagChangeActivity(row)) {
    return (
      <ContextTimelineEntryHeader
        wrap
        title={
          <>
            {actorName}
            <RepaymentTagsChangeSentence row={row} />
          </>
        }
        dateTime={dateTime}
        dateLabel={dateLabel}
        context={headerExtra}
      >
        <NotificationRepaymentMeta row={row} />
      </ContextTimelineEntryHeader>
    )
  }

  if (isOutboundMessage) {
    return (
      <ContextTimelineEntryHeader
        wrap
        title={
          <>
            {actorName}
            <RepaymentTodoEventSentence
              parts={outboundActionSentenceParts(outboundAction, row.type, row.bulk_id)}
            />
          </>
        }
        dateTime={dateTime}
        dateLabel={dateLabel}
        context={headerExtra}
      />
    )
  }

  return (
    <ContextTimelineEntryHeader
      title={
        <>
          {actorName}
          <span className="ms-1 font-normal">{timelineActivityActionVerb(row)}</span>
        </>
      }
      dateTime={dateTime}
      dateLabel={dateLabel}
      context={headerExtra}
    >
      <NotificationRepaymentMeta row={row} />
    </ContextTimelineEntryHeader>
  )
}

export function ActivityTimelineEvent({
  row,
  actor,
  step,
  dateTime,
  dateLabel,
  revisions,
  columnValues,
  headerExtra,
  highlight = false,
  className,
  dataTimelineId,
  dataActivityId,
  onActivate,
  body,
  onEditPlan,
  userLogin,
  savingAction,
  onReopenAction,
  currentActionEvent,
  children
}: Props) {
  const content = body ?? (
    <RepaymentTimelineMessageBody
      row={row}
      onEditPlan={onEditPlan}
      userLogin={userLogin}
      savingAction={savingAction}
      onReopenAction={onReopenAction}
      currentActionEvent={currentActionEvent}
    />
  )

  return (
    <ContextTimelineItem
      step={step}
      actor={actor}
      data-timeline-id={dataTimelineId}
      data-activity-id={dataActivityId}
      className={cn(highlight && TIMELINE_HIGHLIGHT_CLASS, className)}
      onActivate={onActivate}
      header={
        <ActivityTimelineEventHeader
          row={row}
          actorName={actorDisplayName(actor)}
          dateTime={dateTime}
          dateLabel={dateLabel}
          revisions={revisions}
          columnValues={columnValues}
          headerExtra={headerExtra}
        />
      }
    >
      {content}
      {children}
    </ContextTimelineItem>
  )
}

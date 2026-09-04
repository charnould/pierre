import type { ReactNode } from 'react'

import {
  ActivityTimelineEvent,
  type ActivityTimelineEventProps
} from '@/shared/components/timeline/activity-timeline-event'
import { ContextTimelineEntryHeader } from '@/shared/components/timeline/context-timeline-entry-header'
import { actorDisplayName } from '@/shared/components/timeline/timeline-actor-avatar'
import {
  parseActionActivity,
  previousTodoContent,
  todoTimelineSentence
} from '@/shared/lib/activities/action-activity'
import { timelineActivityActionVerb } from '@/shared/lib/timeline/timeline-action-label'
import { COMMUNICATION_TYPES } from '@/shared/types/activites'

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

function RepaymentEventHeader({
  row,
  actor,
  dateTime,
  dateLabel,
  revisions,
  columnValues,
  headerExtra
}: Pick<
  ActivityTimelineEventProps,
  'row' | 'actor' | 'dateTime' | 'dateLabel' | 'revisions' | 'columnValues' | 'headerExtra'
>) {
  const actorName = actorDisplayName(actor)
  const parsed = parseActionActivity(row)
  const previous =
    parsed != null && revisions
      ? previousTodoContent(revisions, parsed.threadId, parsed.revision)
      : null
  const outboundAction = parseTimelineOutboundAction(row)
  const isOutboundMessage =
    (COMMUNICATION_TYPES as readonly string[]).includes(row.type) &&
    /^(user|agent|automation|system):/.test(row.auteur)
  let title: ReactNode

  if (row.type === 'action') {
    title = (
      <>
        {actorName}
        {parsed ? (
          <RepaymentTodoEventSentence parts={todoTimelineSentence(parsed, previous)} />
        ) : (
          <span className="font-normal">{timelineActivityActionVerb(row)}</span>
        )}
      </>
    )
  } else if (isRepaymentStatusChangeActivity(row)) {
    title = (
      <>
        {actorName}
        <RepaymentStatusChangeSentence row={row} columnValues={columnValues} />
      </>
    )
  } else if (isRepaymentTagChangeActivity(row)) {
    title = (
      <>
        {actorName}
        <RepaymentTagsChangeSentence row={row} />
      </>
    )
  } else if (isOutboundMessage) {
    title = (
      <>
        {actorName}
        <RepaymentTodoEventSentence
          parts={outboundActionSentenceParts(outboundAction, row.type, row.bulk_id)}
        />
      </>
    )
  } else {
    title = (
      <>
        {actorName}
        <span className="ms-1 font-normal">{timelineActivityActionVerb(row)}</span>
      </>
    )
  }

  return (
    <ContextTimelineEntryHeader
      wrap
      title={title}
      dateTime={dateTime}
      dateLabel={dateLabel}
      context={headerExtra}
    >
      {isOutboundMessage ? null : <NotificationRepaymentMeta row={row} />}
    </ContextTimelineEntryHeader>
  )
}

export function RepaymentActivityTimelineEvent(props: ActivityTimelineEventProps) {
  const { row, onEditPlan, userLogin, savingAction, onReopenAction, currentActionEvent } = props
  const body =
    props.body === undefined ? (
      <RepaymentTimelineMessageBody
        row={row}
        onEditPlan={onEditPlan}
        userLogin={userLogin}
        savingAction={savingAction}
        onReopenAction={onReopenAction}
        currentActionEvent={currentActionEvent}
      />
    ) : (
      props.body
    )

  return (
    <ActivityTimelineEvent
      {...props}
      header={
        <RepaymentEventHeader
          row={props.row}
          actor={props.actor}
          dateTime={props.dateTime}
          dateLabel={props.dateLabel}
          revisions={props.revisions}
          columnValues={props.columnValues}
          headerExtra={props.headerExtra}
        />
      }
      body={body}
    />
  )
}

import { MentionText } from '@/shared/components/inspector/mention-text'
import { CaseBucketChangeBody } from '@/shared/components/timeline/case-bucket-change-body'
import { CommunicationTimelineMessageBody } from '@/shared/components/timeline/communication-timeline-message-body'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'
import { activity_payload, parse_message_activity_content } from '@/shared/types/activites'

import { formatRepaymentActivityBody } from '../lib/repayment-activity-text'
import { REPAYMENT_BUCKET_OPTIONS } from '../lib/repayment-bucket'
import { parseTimelineMessageBody } from '../lib/repayment-outbound-message'
import {
  isRepaymentPlanProposalActivity,
  RepaymentPlanProposalBody
} from './RepaymentPlanProposalBody'
import {
  isRepaymentStatusChangeActivity,
  RepaymentStatusChangeBody
} from './RepaymentStatusChangeBody'
import { isRepaymentTagChangeActivity, RepaymentTagsChangeBody } from './RepaymentTagsChangeBody'
import { RepaymentTodoEventBody } from './RepaymentTodoEventBody'

interface Props {
  row: Activite
  className?: string
  onEditPlan?: (row: Activite) => void
  userLogin?: string
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  currentActionEvent?: boolean
}

export function RepaymentTimelineMessageBody({
  row,
  className,
  onEditPlan,
  userLogin,
  savingAction,
  onReopenAction,
  currentActionEvent
}: Props) {
  if (row.type === 'activity_boost') return null

  if (row.type === 'action') {
    return (
      <RepaymentTodoEventBody
        row={row}
        userLogin={userLogin}
        saving={savingAction}
        onReopen={onReopenAction}
        current={currentActionEvent}
      />
    )
  }

  if (row.type === 'repayment_plan_close') {
    const payload = activity_payload(row.type, row.contenu)
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <p className="text-foreground m-0 text-sm leading-5 font-medium">
          {typeof payload['motif'] === 'string' ? payload['motif'] : 'Plan clôturé'}
        </p>
        {typeof payload['note'] === 'string' && payload['note'] ? (
          <MentionText
            text={payload['note']}
            mentionVariant="activity"
            compact
            className="text-muted-foreground m-0 text-xs leading-4 whitespace-pre-wrap"
          />
        ) : null}
      </div>
    )
  }

  const message = row.type === 'note' ? parse_message_activity_content(row.contenu) : null
  if (message?.etat === 'retire') {
    return <p className="text-muted-foreground m-0 text-xs leading-4 italic">Note retirée</p>
  }

  if (row.type === 'case_bucket_change') {
    return <CaseBucketChangeBody row={row} options={REPAYMENT_BUCKET_OPTIONS} />
  }

  if (isRepaymentStatusChangeActivity(row)) {
    return <RepaymentStatusChangeBody row={row} />
  }

  if (isRepaymentTagChangeActivity(row)) {
    return <RepaymentTagsChangeBody row={row} />
  }

  if (isRepaymentPlanProposalActivity(row)) {
    return <RepaymentPlanProposalBody row={row} className={className} onEditPlan={onEditPlan} />
  }

  const parsed = parseTimelineMessageBody(row)
  if (parsed?.kind === 'rcs' || parsed?.kind === 'email') {
    return <CommunicationTimelineMessageBody row={row} className={className} />
  }

  if (parsed?.kind === 'note') {
    return (
      <MentionText
        text={parsed.text}
        mentionVariant="activity"
        compact
        className={cn(
          className,
          'text-foreground m-0 text-xs leading-4 break-words whitespace-pre-wrap'
        )}
      />
    )
  }

  return (
    <MentionText
      text={formatRepaymentActivityBody(row)}
      mentionVariant="activity"
      compact
      className={cn(
        className,
        'text-foreground m-0 text-xs leading-4 break-words whitespace-pre-wrap'
      )}
    />
  )
}

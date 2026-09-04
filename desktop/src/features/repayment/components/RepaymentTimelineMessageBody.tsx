import { ChevronDown } from 'lucide-react'

import { MentionText } from '@/shared/components/inspector/mention-text'
import { CaseBucketChangeBody } from '@/shared/components/timeline/case-bucket-change-body'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'
import { activity_payload, parse_message_activity_content } from '@/shared/types/activites'

import { formatRepaymentActivityBody } from '../lib/repayment-activity-text'
import { REPAYMENT_BUCKET_OPTIONS } from '../lib/repayment-bucket'
import { parseTimelineMessageBody } from '../lib/repayment-outbound-message'
import { CommunicationDeliveryLine } from './NotificationRepaymentMeta'
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

  if (parsed?.kind === 'rcs') {
    return (
      <div
        className={cn(
          'border-border bg-card flex flex-col gap-1.5 rounded-md border px-2.5 py-2',
          className
        )}
      >
        <div>
          <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4 font-medium">
            Corps du RCS
          </p>
          <MentionText
            text={parsed.text}
            className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 [text-wrap:pretty] break-words whitespace-pre-wrap"
          />
          {parsed.choices.length ? (
            <p className="text-muted-foreground m-0 mt-1 text-[0.6875rem] leading-4">
              Choix proposés : {parsed.choices.join(' · ')}
            </p>
          ) : null}
        </div>
        <CommunicationDeliveryLine row={row} />
      </div>
    )
  }

  if (parsed?.kind === 'email') {
    const body = parsed.body.trim()
    return (
      <div
        className={cn(
          'border-border bg-card flex flex-col gap-1.5 rounded-md border px-2.5 py-2',
          className
        )}
      >
        {parsed.subject ? (
          <div>
            <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4 font-medium">
              {parsed.medium === 'email' ? 'Objet' : 'Document'}
            </p>
            <p className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 font-semibold [text-wrap:balance] break-words whitespace-pre-wrap">
              {parsed.subject}
            </p>
          </div>
        ) : null}
        {body ? (
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="text-muted-foreground flex w-fit items-center gap-1 text-[0.6875rem] leading-4 font-medium">
              Corps du message
              <ChevronDown className="size-3 transition-transform in-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="outline-none">
              <MentionText
                text={parsed.body}
                className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 [text-wrap:pretty] break-words whitespace-pre-wrap"
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        {parsed.from || parsed.to || parsed.sentAt ? (
          <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4">
            {[
              parsed.from ? `De ${parsed.from}` : null,
              parsed.to ? `À ${parsed.to}` : null,
              parsed.sentAt ? `Envoyé le ${formatInspectorTimelineDateline(parsed.sentAt)}` : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : (
          <CommunicationDeliveryLine row={row} />
        )}
      </div>
    )
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

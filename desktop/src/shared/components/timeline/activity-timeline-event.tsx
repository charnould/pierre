import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { timelineActivityVerb } from '@/shared/lib/timeline/timeline-verb'
import { cn } from '@/shared/lib/utils'
import {
  communication_channel_label,
  is_case_change_type,
  is_communication_opened_type,
  is_note_type,
  is_signature_type,
  is_task_type,
  parse_case_change_content,
  parse_note_content,
  parse_repayment_plan_content,
  parse_signature_content,
  parse_task_content,
  parse_titled_content,
  type Activite
} from '@/shared/types/activites'

import { ContextTimelineEntryHeader } from './context-timeline-entry-header'
import { ContextTimelineItem } from './context-timeline-item'
import { actorDisplayName } from './timeline-actor-avatar'
import {
  TimelineChips,
  TimelineDelta,
  TimelineFact,
  TimelineObject,
  TimelineQuote,
  formatActivityValue
} from './timeline-bodies'
import { TimelineCommunicationEnvelope } from './timeline-communication-envelope'
import { TIMELINE_HIGHLIGHT_CLASS } from './timeline-layout'

export interface ActivityTimelineEventProps {
  row: Activite
  actor: ParsedActivityAuthor
  step: number
  dateTime: string
  dateLabel: string
  statuses?: Activite[]
  revisions?: Map<string, ActionActivity>
  headerExtra?: ReactNode
  highlight?: boolean
  className?: string
  dataTimelineId?: string
  dataActivityId?: string | number
  onActivate?: () => void
  body?: ReactNode
  header?: ReactNode
  onEditPlan?: (row: Activite) => void
  userLogin?: string
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  currentActionEvent?: boolean
  expandable?: boolean
  preview?: boolean
  children?: ReactNode
}

function EventHeader({
  row,
  actorName,
  dateTime,
  dateLabel,
  headerExtra
}: {
  row: Activite
  actorName: string
  dateTime: string
  dateLabel: string
  headerExtra?: ReactNode
}) {
  return (
    <ContextTimelineEntryHeader
      wrap
      title={
        <>
          {actorName}
          <span className="ms-1 font-normal">{timelineActivityVerb(row)}</span>
        </>
      }
      dateTime={dateTime}
      dateLabel={dateLabel}
      context={headerExtra}
    />
  )
}

function EventBody({
  row,
  statuses,
  expandable,
  preview,
  savingAction,
  onReopenAction,
  currentActionEvent,
  onEditPlan
}: Pick<
  ActivityTimelineEventProps,
  | 'row'
  | 'statuses'
  | 'expandable'
  | 'preview'
  | 'savingAction'
  | 'onReopenAction'
  | 'currentActionEvent'
  | 'onEditPlan'
>) {
  if (is_communication_opened_type(row.type)) {
    return (
      <TimelineCommunicationEnvelope
        row={row}
        statuses={statuses}
        expandable={expandable === true && preview !== true}
      />
    )
  }

  if (is_note_type(row.type)) {
    const note = parse_note_content(row.contenu)
    return note?.text ? <TimelineQuote>{note.text}</TimelineQuote> : null
  }

  if (is_task_type(row.type)) {
    const task = parse_task_content(row.contenu)
    if (!task) return null
    const canReopen =
      row.type === 'task.completed' &&
      currentActionEvent === true &&
      onReopenAction != null &&
      task.task.assignee &&
      task.task.due_date
    return (
      <>
        <TimelineObject title={task.task.title}>
          {task.task.assignee ? (
            <p className="text-muted-foreground mt-1">
              Assignée à {task.task.assignee.label}
              {task.task.due_date ? ` · ${task.task.due_date}` : ''}
            </p>
          ) : null}
        </TimelineObject>
        {row.type === 'task.updated' && task.changes
          ? task.changes.map((change) => (
              <TimelineDelta key={change.field} before={change.before} after={change.after} />
            ))
          : null}
        {task.note ? <TimelineQuote>{task.note}</TimelineQuote> : null}
        {task.result ? <TimelineQuote>{task.result}</TimelineQuote> : null}
        {task.reason ? <TimelineQuote>{task.reason}</TimelineQuote> : null}
        {canReopen ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2 w-fit"
            disabled={savingAction}
            onClick={() => onReopenAction?.(row.id, task.task.assignee!.id, task.task.due_date!)}
          >
            Rouvrir la tâche
          </Button>
        ) : null}
      </>
    )
  }

  if (is_case_change_type(row.type) || row.type === 'ticket.field_changed') {
    const change = parse_case_change_content(row.contenu)
    if (!change) return null
    if (row.type === 'case.tags_changed') {
      const after = Array.isArray(change.after)
        ? change.after.map((entry) => (typeof entry === 'string' ? entry : entry.label))
        : []
      return (
        <>
          <div className="mt-2">
            <TimelineChips values={after} />
          </div>
          {change.note ? <TimelineQuote>{change.note}</TimelineQuote> : null}
        </>
      )
    }
    return <TimelineDelta before={change.before} after={change.after} note={change.note} />
  }

  if (is_signature_type(row.type)) {
    const signature = parse_signature_content(row.contenu)
    if (!signature) return null
    const pending = signature.signers.filter((signer) => signer.status === 'pending').length
    const failed =
      row.type === 'document.signature_refused' ||
      row.type === 'document.signature_expired' ||
      row.type === 'document.signature_cancelled'
    return (
      <TimelineObject title={signature.document.title}>
        {signature.signers.length > 0 ? (
          <p className="text-muted-foreground mt-1">
            {signature.signers.map((signer) => signer.label).join(', ')}
          </p>
        ) : null}
        {row.channel ? (
          <p className="text-muted-foreground mt-1">
            Canal {communication_channel_label(row.channel)}
            {signature.provider ? ` · ${signature.provider}` : ''}
          </p>
        ) : signature.provider ? (
          <p className="text-muted-foreground mt-1">{signature.provider}</p>
        ) : null}
        {pending > 0 ? <p className="text-muted-foreground mt-1">{pending} en attente</p> : null}
        {failed && signature.reason ? (
          <p className="text-destructive mt-1">{signature.reason}</p>
        ) : null}
      </TimelineObject>
    )
  }

  if (row.type.startsWith('repayment_plan.')) {
    const plan = parse_repayment_plan_content(row.type, row.contenu)
    if (!plan) return null
    return (
      <>
        <TimelineObject title={plan.title} />
        {plan.note ? <TimelineQuote>{plan.note}</TimelineQuote> : null}
        {onEditPlan && plan.plan && row.type !== 'repayment_plan.closed' ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2 w-fit"
            onClick={() => onEditPlan(row)}
          >
            Ouvrir
          </Button>
        ) : null}
      </>
    )
  }

  const titled = parse_titled_content(row.contenu)
  if (titled) {
    const values = titled.values ?? {}
    return (
      <>
        <TimelineObject title={titled.title}>
          {Object.entries(values).map(([label, value]) => (
            <TimelineFact
              key={label}
              label={label}
              value={formatActivityValue(value)}
              failed={row.type === 'bulk.no_route'}
            />
          ))}
        </TimelineObject>
        {titled.note ? <TimelineQuote>{titled.note}</TimelineQuote> : null}
      </>
    )
  }

  return null
}

export function ActivityTimelineEvent({
  row,
  actor,
  step,
  dateTime,
  dateLabel,
  statuses,
  headerExtra,
  highlight = false,
  className,
  dataTimelineId,
  dataActivityId,
  onActivate,
  body,
  header,
  savingAction,
  onReopenAction,
  currentActionEvent,
  onEditPlan,
  expandable = false,
  preview = false,
  children
}: ActivityTimelineEventProps) {
  const content =
    body === undefined
      ? EventBody({
          row,
          statuses,
          expandable,
          preview,
          savingAction,
          onReopenAction,
          currentActionEvent,
          onEditPlan
        })
      : body

  return (
    <ContextTimelineItem
      step={step}
      actor={actor}
      data-timeline-id={dataTimelineId}
      data-activity-id={dataActivityId}
      className={cn(highlight && TIMELINE_HIGHLIGHT_CLASS, className)}
      onActivate={onActivate}
      header={
        header ?? (
          <EventHeader
            row={row}
            actorName={actorDisplayName(actor)}
            dateTime={dateTime}
            dateLabel={dateLabel}
            headerExtra={headerExtra}
          />
        )
      }
    >
      {content}
      {children}
    </ContextTimelineItem>
  )
}

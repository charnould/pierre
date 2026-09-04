import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { parseActionActivity, type ActionActivity } from '@/shared/lib/activities/action-activity'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { timelineActivityActionVerb } from '@/shared/lib/timeline/timeline-action-label'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import { activity_payload, type Activite } from '@/shared/types/activites'

import { ContextTimelineEntryHeader } from './context-timeline-entry-header'
import { ContextTimelineItem } from './context-timeline-item'
import { actorDisplayName } from './timeline-actor-avatar'
import { TIMELINE_HIGHLIGHT_CLASS } from './timeline-layout'

export interface ActivityTimelineEventProps {
  row: Activite
  actor: ParsedActivityAuthor
  step: number
  dateTime: string
  dateLabel: string
  revisions?: Map<string, ActionActivity>
  columnValues?: ColumnValuesConfig
  headerExtra?: ReactNode
  highlight?: boolean
  className?: string
  dataTimelineId?: string
  dataActivityId?: string | number
  onActivate?: () => void
  /** Replace the default read-only body (note edit form, drawer body + actions). */
  body?: ReactNode
  /** Domain-specific header renderer. */
  header?: ReactNode
  onEditPlan?: (row: Activite) => void
  userLogin?: string
  savingAction?: boolean
  onReopenAction?: (id: number, assigneA: string, dateEcheance: string) => void
  currentActionEvent?: boolean
  children?: ReactNode
}

function defaultHeader(
  row: Activite,
  actorName: string,
  dateTime: string,
  dateLabel: string,
  headerExtra?: ReactNode
) {
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
    />
  )
}

function defaultBody(
  row: Activite,
  options: Pick<
    ActivityTimelineEventProps,
    'savingAction' | 'onReopenAction' | 'currentActionEvent'
  >
) {
  const payload = activity_payload(row.type, row.contenu)
  const title =
    row.type === 'case_assignment' && typeof payload['referent'] === 'string'
      ? `Référent · ${payload['referent']}`
      : row.type === 'case_tag_change' && Array.isArray(payload['tags'])
        ? `Tags · ${payload['tags'].join(', ') || 'Aucun tag'}`
        : row.type === 'case_bucket_change' && typeof payload['bucket'] === 'string'
          ? `Panier · ${payload['bucket']}`
          : typeof payload['objet'] === 'string'
            ? payload['objet']
            : typeof payload['action'] === 'string'
              ? payload['action']
              : ''
  const text =
    typeof payload['note'] === 'string'
      ? payload['note']
      : typeof payload['corps'] === 'string'
        ? payload['corps']
        : typeof payload['contenu'] === 'string'
          ? payload['contenu']
          : typeof payload['resultat'] === 'string'
            ? payload['resultat']
            : typeof payload['motif'] === 'string'
              ? payload['motif']
              : ''
  const action = parseActionActivity(row)
  const canReopen =
    action?.event === 'completed' &&
    options.currentActionEvent === true &&
    options.onReopenAction != null
  if (!title && !text && !canReopen) return null
  return (
    <>
      {title || text ? (
        <div className="border-border/60 mt-2 rounded-md border px-2 py-1.5 text-xs leading-4">
          {title ? <p className="font-medium break-words">{title}</p> : null}
          {text ? <p className="break-words whitespace-pre-wrap">{text}</p> : null}
        </div>
      ) : null}
      {canReopen ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="mt-2 w-fit"
          disabled={options.savingAction}
          onClick={() =>
            options.onReopenAction?.(
              row.id,
              action.contenu.assigne_a ?? '',
              action.contenu.date_echeance ?? ''
            )
          }
        >
          Rouvrir la tâche
        </Button>
      ) : null}
    </>
  )
}

export function ActivityTimelineEvent({
  row,
  actor,
  step,
  dateTime,
  dateLabel,
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
  children
}: ActivityTimelineEventProps) {
  const content =
    body === undefined
      ? defaultBody(row, {
          savingAction,
          onReopenAction,
          currentActionEvent
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
        header ?? defaultHeader(row, actorDisplayName(actor), dateTime, dateLabel, headerExtra)
      }
    >
      {content}
      {children}
    </ContextTimelineItem>
  )
}

import type { Database } from 'bun:sqlite'

import type { Activite } from '../../../shared/activites'
import type {
  BulkDelivery,
  BulkOperationRecord,
  PreviewRow,
  SimpleDeliveryStep,
  SkippedDeliveryStep
} from '../../../shared/bulk-operations'
import { next_status_timestamp } from '../communications/parsing'
import { create_outbound_with_db } from '../communications/storage'
import { render_content, step_placeholders, validate_bindings } from './placeholders'
import { finalize_bulk_item_with_db } from './reports'
import { update_status_with_db } from './status'

export const bulk_step_destination = (row: PreviewRow, step: SimpleDeliveryStep): string =>
  step.medium === 'email' || step.medium === 'lre'
    ? (row.email ?? '')
    : step.medium === 'rcs' || step.medium === 'sms'
      ? (row.telephone ?? '')
      : (row.adresse ?? '')

export const render_fallback_step = (
  row: PreviewRow,
  confirmedAt: string,
  step: SimpleDeliveryStep
): { rendered: unknown; subject?: string; body: string } => {
  const now = new Date(confirmedAt)
  validate_bindings(
    step_placeholders(step),
    step.placeholderBindings,
    new Set(Object.keys(row.values))
  )
  if ('fileBase64' in step) {
    return { rendered: step.filename, body: '' }
  }
  const source =
    'subject' in step ? { subject: step.subject, body: step.body } : { body: step.body }
  const rendered = render_content(source, step.placeholderBindings, row.values, now) as {
    subject?: string
    body: string
  }
  return {
    rendered,
    subject: rendered.subject,
    body: rendered.body
  }
}

export const fallback_outbound_contenu = (
  step: SimpleDeliveryStep,
  rendered: { subject?: string; body: string },
  skipped: SkippedDeliveryStep[]
): string =>
  JSON.stringify({
    version: 1,
    action: step.action,
    objet: rendered.subject ?? '',
    corps: 'fileBase64' in step ? '' : rendered.body,
    ...('fileBase64' in step ? { resume: step.summary } : {}),
    canal: step.medium,
    delivery: { skippedSteps: skipped, history: [] }
  })

export const rich_rcs_outbound_contenu = (
  delivery: Extract<BulkDelivery, { kind: 'rich_rcs' }>,
  node: (typeof delivery.nodes)[number],
  rendered: { body: string; richContent: Record<string, unknown> },
  nodeIndex: number
): string =>
  JSON.stringify({
    version: 1,
    action: delivery.action,
    objet: '',
    corps: rendered.body,
    canal: 'rcs',
    richContent: rendered.richContent,
    nodeId: node.id,
    nodeIndex
  })

export const record_applied_outbound_with_db = (
  db: Database,
  input: {
    actor: string
    operation: Pick<BulkOperationRecord, 'id' | 'definition'>
    executionId: string
    jobId: string
    row: PreviewRow
    confirmedAt: string
  }
): Activite => {
  const delivery = input.operation.definition.delivery
  const common = {
    actor: input.actor,
    contexte: 'repayment' as const,
    ref: input.row.id_locataire,
    bulk_id: input.operation.id,
    execution_id: input.executionId,
    notify_current_manager: input.operation.definition.notifyManager,
    require_bulk_run: {
      bulk_operation_id: input.operation.id,
      execution_id: input.executionId
    }
  }

  let activity: Activite
  let type: SimpleDeliveryStep['medium']
  if (delivery.kind === 'rich_rcs') {
    const node = delivery.nodes[0]!
    const rendered = render_content(
      { body: node.body, richContent: node.richContent },
      delivery.placeholderBindings,
      input.row.values,
      new Date(input.confirmedAt)
    ) as { body: string; richContent: Record<string, unknown> }
    type = 'rcs'
    activity = create_outbound_with_db(db, {
      ...common,
      type: 'rcs',
      destinataire: input.row.telephone ?? '',
      contenu: rich_rcs_outbound_contenu(delivery, node, rendered, 0),
      idempotency_key: `bulk:${input.executionId}:recipient:${input.row.id_locataire}:node:${node.id}`
    })
  } else {
    const stepIndex = input.row.route?.kind === 'fallback' ? input.row.route.stepIndex : 0
    const step = delivery.steps[stepIndex]!
    const rendered = render_fallback_step(input.row, input.confirmedAt, step)
    type = step.medium
    activity = create_outbound_with_db(db, {
      ...common,
      type: step.medium,
      destinataire: bulk_step_destination(input.row, step),
      contenu: fallback_outbound_contenu(step, rendered, input.row.skippedSteps),
      idempotency_key: `bulk:${input.executionId}:recipient:${input.row.id_locataire}:attempt:${stepIndex}`
    })
  }

  db.run(
    `UPDATE bulk_jobs SET current_activity_id = ?
     WHERE id = ? AND report_status = 'in_progress'`,
    [activity.id, input.jobId]
  )
  const sent = update_status_with_db(db, {
    activity_id: activity.id,
    type,
    statut: 'sent',
    occurred_at: next_status_timestamp(activity)
  }).activity

  const item = db
    .query<{ payload: string }, [string]>('SELECT payload FROM bulk_jobs WHERE id = ?')
    .get(input.jobId)!
  finalize_bulk_item_with_db(db, {
    jobId: input.jobId,
    status: 'ok',
    outcome: { code: 'applied', activity_id: sent.id, created: true },
    currentActivityId: sent.id,
    payload: JSON.parse(item.payload) as Record<string, unknown>,
    completedAt: sent.date_statut
  })
  return sent
}

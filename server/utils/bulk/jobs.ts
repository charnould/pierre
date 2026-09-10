import { Database } from 'bun:sqlite'

import type { Activite } from '../../../shared/activites'

export type DeliveryStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'undelivered'
  | 'expired'
  | 'rejected'
  | 'bounced'
  | 'returned'
  | 'refused'
  | 'unclaimed'
import type {
  BulkOperationDefinition,
  BulkOperationRecord,
  BulkRichRcsResponse,
  PreviewRow
} from '../../../shared/bulk-operations'
import { apply_bucket_effect } from './activities'
import { finalize_bulk_item_with_db } from './reports'

export type BulkItemPayload =
  | {
      kind: 'fallback'
      row: PreviewRow
      stage: 'attempt' | 'status'
      stepIndex: number
      remainingStatuses?: DeliveryStatus[]
      previousActivityId?: number
      effectsAppliedAt?: string
    }
  | {
      kind: 'rich_rcs'
      row: PreviewRow
      stage: 'rich_send' | 'rich_wait_delivery' | 'rich_wait_reply'
      nodeId: string
      responseHistory: BulkRichRcsResponse[]
      effectsAppliedAt?: string
    }

export type BulkRunContext = {
  actor: string
  operation: Pick<
    BulkOperationRecord,
    'id' | 'name' | 'description' | 'definition' | 'reportsToKeep'
  >
  confirmedAt: string
}

export const load_bulk_run_context_with_db = (
  db: Database,
  executionId: string,
  bulkOperationId?: string
): BulkRunContext | null => {
  const run = db
    .query<
      {
        auteur: string
        date_creation: string
        id: string
        name: string
        description: string
        definition: string
        reports_to_keep: number
      },
      [string, string | null, string | null]
    >(
      `SELECT run.auteur, run.date_creation, operation.id, operation.name,
              operation.description, operation.definition, operation.reports_to_keep
       FROM activites run
       JOIN bulk_operations operation ON operation.id = run.bulk_id
       WHERE run.type = 'bulk.ran'
         AND run.execution_id = ?
         AND (? IS NULL OR run.bulk_id = ?)
       LIMIT 1`
    )
    .get(executionId, bulkOperationId ?? null, bulkOperationId ?? null)
  if (!run) return null
  return {
    actor: run.auteur.replace(/^[^:]+:/, ''),
    operation: {
      id: run.id,
      name: run.name,
      description: run.description,
      definition: JSON.parse(run.definition) as BulkOperationDefinition,
      reportsToKeep: run.reports_to_keep
    },
    confirmedAt: run.date_creation
  }
}

export const enrich_final_failure = (
  _db: Database,
  _activityId: number,
  _reason: Record<string, unknown>
): void => {
  // Append-only: the communication.failed event already carries the reason.
}

export const schedule_bulk_fallback_with_db = (
  db: Database,
  activity: Activite,
  occurredAt: string
): boolean => {
  if (!activity.execution_id || !activity.id_locataire || !activity.bulk_id) return false
  const item = db
    .query<{ id: string; payload: string }, [string, string, number]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ?
         AND current_activity_id = ? AND report_status = 'in_progress'
       LIMIT 1`
    )
    .get(activity.execution_id, activity.id_locataire, activity.id)
  if (!item) return false
  const context = load_bulk_run_context_with_db(db, activity.execution_id, activity.bulk_id)
  if (!context || context.operation.definition.delivery.kind !== 'fallback') return false
  const payload = JSON.parse(item.payload) as BulkItemPayload
  if (payload.kind !== 'fallback') return false
  const nextStep = payload.stepIndex + 1
  if (nextStep >= context.operation.definition.delivery.steps.length) {
    const finalFailure = {
      code: 'all_delivery_attempts_failed',
      status: activity.type === 'communication.failed' ? 'failed' : activity.type,
      occurred_at: occurredAt
    }
    enrich_final_failure(db, activity.id, finalFailure)
    finalize_bulk_item_with_db(db, {
      jobId: item.id,
      status: 'ko',
      outcome: finalFailure,
      currentActivityId: activity.id,
      completedAt: occurredAt,
      payload
    })
    return false
  }
  const nextStepDefinition = context.operation.definition.delivery.steps[nextStep]!
  const nextPayload: BulkItemPayload = {
    ...payload,
    stage: 'attempt',
    stepIndex: nextStep,
    previousActivityId: activity.id,
    remainingStatuses: undefined
  }
  db.run(
    `UPDATE bulk_jobs
     SET run_at = ?, payload = ?, last_error = NULL
     WHERE id = ?`,
    [occurredAt, JSON.stringify(nextPayload), item.id]
  )
  void nextStepDefinition
  return true
}

export const apply_sent_bucket_effect_with_db = (db: Database, activity: Activite): void => {
  if (!activity.execution_id || !activity.id_locataire || !activity.bulk_id) return
  const item = db
    .query<{ id: string; payload: string }, [string, string]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ? LIMIT 1`
    )
    .get(activity.execution_id, activity.id_locataire)
  const context = load_bulk_run_context_with_db(db, activity.execution_id, activity.bulk_id)
  if (!item || !context) return
  const payload = JSON.parse(item.payload) as BulkItemPayload
  if (payload.effectsAppliedAt) return
  apply_bucket_effect(db, {
    actor: context.actor,
    bulkId: activity.bulk_id,
    executionId: activity.execution_id,
    row: payload.row,
    bucketId: context.operation.definition.bucketId,
    notifyManager: context.operation.definition.notifyManager
  })
  const nextPayload: BulkItemPayload = { ...payload, effectsAppliedAt: activity.date_creation }
  db.run('UPDATE bulk_jobs SET payload = ? WHERE id = ?', [JSON.stringify(nextPayload), item.id])
}

export const settle_bulk_item_for_status_with_db = (
  db: Database,
  activity: Activite,
  status: DeliveryStatus,
  occurredAt: string
): void => {
  if (
    !activity.execution_id ||
    !activity.id_locataire ||
    !activity.bulk_id ||
    (status !== 'delivered' && status !== 'read')
  ) {
    return
  }
  const item = db
    .query<{ id: string; payload: string }, [string, string, number]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ?
         AND current_activity_id = ? AND report_status = 'in_progress'
       LIMIT 1`
    )
    .get(activity.execution_id, activity.id_locataire, activity.id)
  if (!item) return
  const payload = JSON.parse(item.payload) as BulkItemPayload
  if (payload.kind !== 'fallback') return
  finalize_bulk_item_with_db(db, {
    jobId: item.id,
    status: 'ok',
    outcome: { code: status, medium: activity.channel ?? activity.type, activity_id: activity.id },
    currentActivityId: activity.id,
    completedAt: occurredAt,
    payload
  })
}

import { Database } from 'bun:sqlite'

import type { Activity } from '../../../shared/activities'
import type {
  BulkDeliveryStatus,
  BulkJobPayload,
  BulkOperationRecord
} from '../../../shared/bulk-operations'
import { apply_bucket_effect } from './activities'
import { finalize_bulk_item_with_db } from './reports'
import { parseStoredDefinition } from './stored-definition'
import { parseStoredPayload, stringifyStoredPayload } from './stored-job'

export type DeliveryStatus = BulkDeliveryStatus
export type BulkItemPayload = BulkJobPayload

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
      definition: parseStoredDefinition(JSON.parse(run.definition)),
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
  activity: Activity,
  occurredAt: string
): boolean => {
  if (!activity.executionId || !activity.id_locataire || !activity.bulkId) return false
  const item = db
    .query<{ id: string; payload: string }, [string, string, number]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ?
         AND current_activity_id = ? AND report_status = 'in_progress'
       LIMIT 1`
    )
    .get(activity.executionId, activity.id_locataire, activity.id)
  if (!item) return false
  const context = load_bulk_run_context_with_db(db, activity.executionId, activity.bulkId)
  if (!context || context.operation.definition.delivery.kind !== 'fallback') return false
  const payload = parseStoredPayload(JSON.parse(item.payload))
  if (payload.kind !== 'fallback') return false
  const nextStep = payload.stepIndex + 1
  if (nextStep >= context.operation.definition.delivery.steps.length) {
    const finalFailure = {
      code: 'all_delivery_attempts_failed' as const,
      status: activity.type === 'communication.failed' ? 'failed' : activity.type,
      occurredAt
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
    [occurredAt, stringifyStoredPayload(nextPayload), item.id]
  )
  void nextStepDefinition
  return true
}

export const apply_sent_bucket_effect_with_db = (db: Database, activity: Activity): void => {
  if (!activity.executionId || !activity.id_locataire || !activity.bulkId) return
  const item = db
    .query<{ id: string; payload: string }, [string, string]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ? LIMIT 1`
    )
    .get(activity.executionId, activity.id_locataire)
  const context = load_bulk_run_context_with_db(db, activity.executionId, activity.bulkId)
  if (!item || !context) return
  const payload = parseStoredPayload(JSON.parse(item.payload))
  if (payload.effectsAppliedAt) return
  apply_bucket_effect(db, {
    actor: context.actor,
    bulkId: activity.bulkId,
    executionId: activity.executionId,
    row: payload.row,
    bucketId: context.operation.definition.bucketId,
    notifyManager: context.operation.definition.notifyManager
  })
  const nextPayload: BulkItemPayload = { ...payload, effectsAppliedAt: activity.createdAt }
  db.run('UPDATE bulk_jobs SET payload = ? WHERE id = ?', [
    stringifyStoredPayload(nextPayload),
    item.id
  ])
}

export const settle_bulk_item_for_status_with_db = (
  db: Database,
  activity: Activity,
  status: DeliveryStatus,
  occurredAt: string
): void => {
  if (
    !activity.executionId ||
    !activity.id_locataire ||
    !activity.bulkId ||
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
    .get(activity.executionId, activity.id_locataire, activity.id)
  if (!item) return
  const payload = parseStoredPayload(JSON.parse(item.payload))
  if (payload.kind !== 'fallback') return
  finalize_bulk_item_with_db(db, {
    jobId: item.id,
    status: 'ok',
    outcome: { code: status, medium: activity.channel ?? activity.type, activityId: activity.id },
    currentActivityId: activity.id,
    completedAt: occurredAt,
    payload
  })
}

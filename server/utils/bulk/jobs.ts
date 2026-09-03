import { Database } from 'bun:sqlite'

import type { ActivityStatus, Activite } from '../../../shared/activites'
import type {
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
      remainingStatuses?: ActivityStatus[]
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

type RunSnapshot = {
  snapshot?: {
    operation?: BulkRunContext['operation']
    confirmed_at?: string
  }
}

const parse_object = (raw: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(raw)
    return value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export const load_bulk_run_context_with_db = (
  db: Database,
  executionId: string,
  bulkOperationId?: string
): BulkRunContext | null => {
  const run = db
    .query<{ contenu: string; auteur: string }, [string, string | null, string | null]>(
      `SELECT run.contenu, run.auteur
       FROM activites run
       JOIN bulk_operations operation ON operation.id = run.bulk_id
       WHERE run.type = 'bulk_run'
         AND run.execution_id = ?
         AND (? IS NULL OR run.bulk_id = ?)
       LIMIT 1`
    )
    .get(executionId, bulkOperationId ?? null, bulkOperationId ?? null)
  if (!run) return null
  const parsed = JSON.parse(run.contenu) as RunSnapshot
  if (!parsed.snapshot?.operation || !parsed.snapshot.confirmed_at) return null
  return {
    actor: run.auteur.replace(/^[^:]+:/, ''),
    operation: parsed.snapshot.operation,
    confirmedAt: parsed.snapshot.confirmed_at
  }
}

export const enrich_final_failure = (
  db: Database,
  activityId: number,
  reason: Record<string, unknown>
): void => {
  const row = db
    .query<{ contenu: string }, [number]>('SELECT contenu FROM activites WHERE id = ?')
    .get(activityId)
  if (!row) return
  const content = parse_object(row.contenu)
  const delivery =
    content['delivery'] && typeof content['delivery'] === 'object'
      ? (content['delivery'] as Record<string, unknown>)
      : {}
  db.run('UPDATE activites SET contenu = ? WHERE id = ?', [
    JSON.stringify({ ...content, delivery: { ...delivery, finalFailure: reason } }),
    activityId
  ])
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
      status: activity.statut,
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
  const content = parse_object(activity.contenu)
  const delivery =
    content['delivery'] && typeof content['delivery'] === 'object'
      ? (content['delivery'] as Record<string, unknown>)
      : {}
  db.run('UPDATE activites SET contenu = ? WHERE id = ?', [
    JSON.stringify({
      ...content,
      delivery: {
        ...delivery,
        fallback: {
          scheduled: true,
          occurred_at: occurredAt,
          medium: nextStepDefinition.medium
        }
      }
    }),
    activity.id
  ])
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
  const nextPayload: BulkItemPayload = { ...payload, effectsAppliedAt: activity.date_statut }
  db.run('UPDATE bulk_jobs SET payload = ? WHERE id = ?', [JSON.stringify(nextPayload), item.id])
}

export const settle_bulk_item_for_status_with_db = (
  db: Database,
  activity: Activite,
  status: ActivityStatus,
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
    outcome: { code: status, medium: activity.type, activity_id: activity.id },
    currentActivityId: activity.id,
    completedAt: occurredAt,
    payload
  })
}

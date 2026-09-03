import { Database } from 'bun:sqlite'

import type { Activite, ActivityStatus } from '../../../shared/activites'
import type { BulkRichRcsResponse, BulkRichRcsNode } from '../../../shared/bulk-operations'
import { datastorePaths } from '../paths'
import { load_bulk_run_context_with_db, type BulkItemPayload } from './jobs'
import { finalize_bulk_item_with_db } from './reports'

const datastore_path = (): string => datastorePaths().database

const string_at = (value: unknown, ...path: string[]): string | null => {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' && current.trim() ? current.trim() : null
}

export const handle_rich_rcs_status_with_db = (
  db: Database,
  activity: Activite,
  status: ActivityStatus,
  occurredAt: string
): boolean => {
  if (!activity.bulk_id || !activity.execution_id || !activity.id_locataire) return false
  const item = db
    .query<{ id: string; payload: string }, [string, string, number]>(
      `SELECT id, payload FROM bulk_jobs
       WHERE execution_id = ? AND item_id = ? AND current_activity_id = ?
         AND report_status = 'in_progress'
       LIMIT 1`
    )
    .get(activity.execution_id, activity.id_locataire, activity.id)
  if (!item) return false
  const context = load_bulk_run_context_with_db(db, activity.execution_id, activity.bulk_id)
  const payload = JSON.parse(item.payload) as BulkItemPayload
  if (
    !context ||
    context.operation.definition.delivery.kind !== 'rich_rcs' ||
    payload.kind !== 'rich_rcs'
  ) {
    return false
  }
  if (!['sent', 'delivered', 'read', 'failed'].includes(status)) return true
  if (status === 'failed') {
    finalize_bulk_item_with_db(db, {
      jobId: item.id,
      status: 'ko',
      outcome: {
        code: 'send_failed',
        node_id: payload.nodeId,
        activity_id: activity.id
      },
      currentActivityId: activity.id,
      completedAt: occurredAt,
      payload
    })
  } else if (
    (status === 'delivered' || status === 'read') &&
    payload.stage === 'rich_wait_delivery'
  ) {
    finalize_bulk_item_with_db(db, {
      jobId: item.id,
      status: 'ok',
      outcome: {
        code: 'completed',
        delivery_status: status,
        node_id: payload.nodeId,
        activity_id: activity.id
      },
      currentActivityId: activity.id,
      completedAt: occurredAt,
      payload
    })
  }
  return true
}

const node_for = (nodes: readonly BulkRichRcsNode[], nodeId: string): BulkRichRcsNode | null =>
  nodes.find((node) => node.id === nodeId) ?? null

export const handle_rich_rcs_reply = (
  source: Activite,
  inbound: Activite,
  rawPayload: Record<string, unknown>
): boolean => {
  if (!source.bulk_id || !source.execution_id || !source.id_locataire) return false
  const db = new Database(datastore_path())
  let advanced = false
  db.run('BEGIN IMMEDIATE')
  try {
    const item = db
      .query<{ id: string; payload: string }, [string, string, number]>(
        `SELECT id, payload FROM bulk_jobs
         WHERE execution_id = ? AND item_id = ? AND current_activity_id = ?
           AND report_status = 'in_progress'
         LIMIT 1`
      )
      .get(source.execution_id, source.id_locataire, source.id)
    const context = load_bulk_run_context_with_db(db, source.execution_id, source.bulk_id)
    if (!item || !context || context.operation.definition.delivery.kind !== 'rich_rcs') {
      db.run('COMMIT')
      return false
    }
    const payload = JSON.parse(item.payload) as BulkItemPayload
    if (payload.kind !== 'rich_rcs' || payload.stage !== 'rich_wait_reply') {
      db.run('COMMIT')
      return false
    }
    if (payload.responseHistory.some((response) => response.activityId === inbound.id)) {
      db.run('COMMIT')
      return true
    }
    if (payload.responseHistory.some((response) => response.nodeId === payload.nodeId)) {
      db.run('COMMIT')
      return true
    }
    const node = node_for(context.operation.definition.delivery.nodes, payload.nodeId)
    const postback = string_at(rawPayload, 'event', 'custom', 'postbackdata')
    if (!node || !postback || !(postback in node.transitions)) {
      db.run('COMMIT')
      return true
    }
    const response: BulkRichRcsResponse = {
      nodeId: node.id,
      postback,
      label: string_at(rawPayload, 'event', 'custom', 'label'),
      text:
        string_at(rawPayload, 'message', 'text') ??
        string_at(rawPayload, 'event', 'custom', 'label') ??
        postback,
      activityId: inbound.id,
      occurredAt: inbound.date_creation
    }
    const nextPayload: BulkItemPayload = {
      ...payload,
      responseHistory: [...payload.responseHistory, response]
    }
    const target = node.transitions[postback]
    if (target === null) {
      finalize_bulk_item_with_db(db, {
        jobId: item.id,
        status: 'ok',
        outcome: {
          code: 'completed',
          last_postback: response.postback,
          last_label: response.label,
          activity_id: source.id
        },
        currentActivityId: source.id,
        completedAt: inbound.date_creation,
        payload: nextPayload
      })
    } else if (target) {
      const scheduled: BulkItemPayload = {
        ...nextPayload,
        stage: 'rich_send',
        nodeId: target
      }
      db.run(
        `UPDATE bulk_jobs
         SET current_activity_id = NULL, run_at = ?, payload = ?, last_error = NULL
         WHERE id = ?`,
        [inbound.date_creation, JSON.stringify(scheduled), item.id]
      )
      advanced = true
    } else {
      db.run('COMMIT')
      return true
    }
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  if (advanced) {
    queueMicrotask(() => {
      void import('./scheduler/queue').then(({ arm_bulk_scheduler }) => arm_bulk_scheduler())
    })
  }
  return true
}

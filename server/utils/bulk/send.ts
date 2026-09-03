import { Database } from 'bun:sqlite'

import { activity_timestamp } from '../../../shared/activites'
import {
  bulkDeliveryError,
  type BulkOperationExecuteResult,
  type BulkOperationRecord
} from '../../../shared/bulk-operations'
import { user_destinataire } from '../activities/rows'
import { datastorePaths } from '../paths'
import { insert_bulk_visible_activity } from './activities'
import type { BulkItemPayload } from './jobs'
import { record_applied_outbound_with_db } from './outbound'
import { preview_query_with_db } from './preview'
import { aggregate_bulk_run_with_db, finalize_bulk_item_with_db } from './reports'
import { arm_bulk_scheduler } from './scheduler/queue'

export type ExecuteResult = BulkOperationExecuteResult

export class BulkExecutionError extends Error {
  constructor(
    message: string,
    readonly code: 'not_implemented' | 'invalid'
  ) {
    super(message)
    this.name = 'BulkExecutionError'
  }
}

const datastore_path = (): string => datastorePaths().database

const parse_replay = (raw: string): ExecuteResult | null => {
  try {
    const value = JSON.parse(raw) as { result?: ExecuteResult }
    return value.result ?? null
  } catch {
    return null
  }
}

export const execute_bulk_operation = async (
  actor: string,
  bulkOperation: BulkOperationRecord,
  options: { mode: 'send' | 'apply_without_send'; clientCommandId: string }
): Promise<ExecuteResult> => {
  if (bulkOperation.definition.source !== 'comptes_locataires') {
    throw new BulkExecutionError(
      `Source non implémentée : ${bulkOperation.definition.source}`,
      'not_implemented'
    )
  }
  const deliveryError = bulkDeliveryError(bulkOperation.definition.delivery)
  if (deliveryError) throw new BulkExecutionError(deliveryError, 'invalid')
  const db = new Database(datastore_path())
  const execution_id = Bun.randomUUIDv7()
  const runKey = `bulk:${bulkOperation.id}:command:${options.clientCommandId}`
  let result: ExecuteResult
  let queued = false
  let committed = false
  let confirmedAt = ''
  db.run('BEGIN IMMEDIATE')
  try {
    const replay = db
      .query<{ contenu: string }, [string]>(
        `SELECT contenu FROM activites
         WHERE type = 'bulk_run' AND idempotency_key = ? LIMIT 1`
      )
      .get(runKey)
    if (replay) {
      const parsed = parse_replay(replay.contenu)
      if (!parsed) throw new Error('Exécution bulk idempotente illisible')
      db.run('COMMIT')
      return parsed
    }

    confirmedAt = activity_timestamp()
    const preview = preview_query_with_db(db, {
      definition: bulkOperation.definition,
      bulkOperationId: bulkOperation.id,
      confirmedAt: new Date(confirmedAt)
    })
    const totals: ExecuteResult['totals'] = {
      total: preview.totals.total,
      queued: options.mode === 'send' ? preview.totals.eligible : 0,
      no_usable_route: preview.totals.no_usable_route,
      applied: options.mode === 'apply_without_send' ? preview.totals.eligible : 0
    }
    result = { execution_id, totals }
    const now = confirmedAt
    const operationSnapshot = {
      id: bulkOperation.id,
      name: bulkOperation.name,
      description: bulkOperation.description,
      definition: bulkOperation.definition,
      reportsToKeep: bulkOperation.reportsToKeep
    }
    const runContent = JSON.stringify({
      version: 1,
      titre: bulkOperation.name,
      id_execution: execution_id,
      client_command_id: options.clientCommandId,
      source: bulkOperation.definition.source,
      mode: options.mode,
      result,
      status: 'in_progress',
      counts: { total: preview.rows.length, in_progress: preview.rows.length, ok: 0, ko: 0 },
      completed_at: null,
      snapshot: {
        operation: operationSnapshot,
        confirmed_at: confirmedAt
      }
    })
    db.run(
      `INSERT INTO activites (
         date_creation, date_statut, rattachement, auteur, type, statut, mentions,
         contenu, bulk_id, execution_id, idempotency_key
       ) VALUES (?, ?, ?, ?, 'bulk_run', 'logged', '[]', ?, ?, ?, ?)`,
      [
        now,
        now,
        `bulk:${bulkOperation.id}`,
        user_destinataire(actor),
        runContent,
        bulkOperation.id,
        execution_id,
        runKey
      ]
    )

    for (const row of preview.rows) {
      const jobId = Bun.randomUUIDv7()
      const payload: BulkItemPayload =
        bulkOperation.definition.delivery.kind === 'rich_rcs'
          ? {
              kind: 'rich_rcs',
              row,
              stage: 'rich_send',
              nodeId: bulkOperation.definition.delivery.nodes[0]!.id,
              responseHistory: []
            }
          : {
              kind: 'fallback',
              row,
              stage: 'attempt',
              stepIndex: row.route?.kind === 'fallback' ? row.route.stepIndex : 0
            }
      db.run(
        `INSERT INTO bulk_jobs (
           id, bulk_operation_id, execution_id, item_id, source, mode,
           report_status, run_at, payload
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          bulkOperation.id,
          execution_id,
          row.id_locataire,
          bulkOperation.definition.source,
          options.mode,
          'in_progress',
          options.mode === 'send' && row.status === 'eligible' ? now : null,
          JSON.stringify(payload)
        ]
      )
      if (row.status === 'eligible' && row.route != null) {
        if (options.mode === 'send') queued = true
        else {
          record_applied_outbound_with_db(db, {
            actor,
            operation: bulkOperation,
            executionId: execution_id,
            jobId,
            row,
            confirmedAt
          })
        }
      }
    }

    for (const row of preview.rows) {
      if (row.status === 'eligible' && row.route != null) {
        continue
      }
      const created = insert_bulk_visible_activity(db, {
        actor,
        bulkId: bulkOperation.id,
        executionId: execution_id,
        row,
        type: 'bulk_no_route',
        status: 'logged',
        content: {
          action: 'Aucune route de communication exploitable',
          skipped_steps: row.skippedSteps,
          no_usable_route: true
        },
        notifyManager: bulkOperation.definition.notifyManager,
        idempotencyKey: `bulk:${execution_id}:recipient:${row.id_locataire}:no-route`
      })
      const activity = db
        .query<{ id: number }, [string]>(
          'SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1'
        )
        .get(`bulk:${execution_id}:recipient:${row.id_locataire}:no-route`)
      const item = db
        .query<{ id: string; payload: string }, [string, string]>(
          'SELECT id, payload FROM bulk_jobs WHERE execution_id = ? AND item_id = ?'
        )
        .get(execution_id, row.id_locataire)!
      finalize_bulk_item_with_db(db, {
        jobId: item.id,
        status: 'ko',
        outcome: {
          code: 'no_usable_route',
          skipped_steps: row.skippedSteps,
          activity_id: activity?.id ?? null,
          created
        },
        currentActivityId: activity?.id ?? null,
        payload: JSON.parse(item.payload) as Record<string, unknown>,
        completedAt: now
      })
    }
    aggregate_bulk_run_with_db(db, execution_id, now)
    db.run('COMMIT')
    committed = true
  } catch (error) {
    if (!committed) db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  if (queued) arm_bulk_scheduler()
  return result!
}

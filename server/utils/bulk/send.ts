import { activityTimestamp } from '../../../shared/activities'
import { bulkDeliveryError, type BulkOperationExecuteResult } from '../../../shared/bulk-operations'
import { insert_activity_row, user_destinataire } from '../activities/rows'
import { openDatastore } from '../datastore-db'
import { insert_bulk_visible_activity } from './activities'
import type { BulkItemPayload } from './jobs'
import { record_applied_outbound_with_db } from './outbound'
import { preview_query_with_db } from './preview'
import { aggregate_bulk_run_with_db, finalize_bulk_item_with_db } from './reports'
import { bulkRunResult, parseBulkRunContent, stringifyBulkRunContent } from './run-content'
import { arm_bulk_scheduler } from './scheduler/queue'
import { get_bulk_operation_with_db } from './store'
import { parseStoredPayload, stringifyStoredPayload } from './stored-job'

export type ExecuteResult = BulkOperationExecuteResult

export class BulkExecutionError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'not_implemented' | 'invalid'
  ) {
    super(message)
    this.name = 'BulkExecutionError'
  }
}

export const execute_bulk_operation = async (
  actor: string,
  bulkOperationId: string,
  options: { mode: 'send' | 'apply_without_send'; clientCommandId: string }
): Promise<ExecuteResult> => {
  const db = openDatastore()
  const execution_id = Bun.randomUUIDv7()
  const runKey = `bulk:${bulkOperationId}:command:${options.clientCommandId}`
  let result: ExecuteResult
  let queued = false
  let committed = false
  let confirmedAt = ''
  db.run('BEGIN IMMEDIATE')
  try {
    const replay = db
      .query<{ contenu: string }, [string]>(
        `SELECT contenu FROM activites
         WHERE type = 'bulk.ran' AND idempotency_key = ? LIMIT 1`
      )
      .get(runKey)
    if (replay) {
      const result = bulkRunResult(parseBulkRunContent(replay.contenu))
      db.run('COMMIT')
      return result
    }

    const bulkOperation = get_bulk_operation_with_db(db, bulkOperationId)
    if (!bulkOperation) throw new BulkExecutionError('Bulk operation not found', 'not_found')
    if (bulkOperation.definition.source !== 'comptes_locataires') {
      throw new BulkExecutionError(
        `Source non implémentée : ${bulkOperation.definition.source}`,
        'not_implemented'
      )
    }
    const deliveryError = bulkDeliveryError(bulkOperation.definition.delivery)
    if (deliveryError) throw new BulkExecutionError(deliveryError, 'invalid')

    confirmedAt = activityTimestamp()
    const now = confirmedAt
    const preview = preview_query_with_db(db, {
      definition: bulkOperation.definition,
      limit: 0
    })
    const totals: ExecuteResult['totals'] = {
      total: preview.totals.total,
      queued: options.mode === 'send' ? preview.totals.eligible : 0,
      noUsableRoute: preview.totals.noUsableRoute,
      applied: options.mode === 'apply_without_send' ? preview.totals.eligible : 0
    }
    queued = options.mode === 'send' && preview.totals.eligible > 0
    result = { executionId: execution_id, totals }
    insert_activity_row(db, {
      date_creation: now,
      rattachement: `bulk:${bulkOperation.id}`,
      auteur: user_destinataire(actor),
      facets: { id_client: null, id_locataire: null, id_lot: null },
      type: 'bulk.ran',
      mentions: [],
      contenu: stringifyBulkRunContent({
        version: 2,
        title: bulkOperation.name,
        values: {
          execution_id,
          client_command_id: options.clientCommandId,
          source: bulkOperation.definition.source,
          mode: options.mode,
          total: result.totals.total,
          queued: result.totals.queued,
          no_usable_route: result.totals.noUsableRoute,
          applied: result.totals.applied
        }
      }),
      bulk_id: bulkOperation.id,
      execution_id,
      idempotency_key: runKey
    })
    preview_query_with_db(db, {
      definition: bulkOperation.definition,
      onRow(row) {
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
            stringifyStoredPayload(payload)
          ]
        )
      }
    })
    while (true) {
      const item = db
        .query<{ id: string; payload: string }, [string]>(
          `SELECT id, payload FROM bulk_jobs
           WHERE execution_id = ? AND report_status = 'in_progress' AND run_at IS NULL
           LIMIT 1`
        )
        .get(execution_id)
      if (!item) break
      const row = parseStoredPayload(JSON.parse(item.payload)).row
      if (options.mode !== 'send' && row.status === 'eligible' && row.route != null) {
        record_applied_outbound_with_db(db, {
          actor,
          operation: bulkOperation,
          executionId: execution_id,
          jobId: item.id,
          row,
          confirmedAt
        })
        continue
      }
      const created = insert_bulk_visible_activity(db, {
        actor,
        bulkId: bulkOperation.id,
        executionId: execution_id,
        row,
        type: 'bulk.no_route',
        content: {
          title: 'Aucune route de communication exploitable',
          skipped_steps: row.skippedSteps.map((step) => step.medium).join(', ')
        },
        notifyManager: bulkOperation.definition.notifyManager,
        idempotencyKey: `bulk:${execution_id}:recipient:${row.id_locataire}:no-route`
      })
      const activity = db
        .query<{ id: number }, [string]>(
          'SELECT id FROM activites WHERE idempotency_key = ? LIMIT 1'
        )
        .get(`bulk:${execution_id}:recipient:${row.id_locataire}:no-route`)
      finalize_bulk_item_with_db(db, {
        jobId: item.id,
        status: 'ko',
        outcome: {
          code: 'no_usable_route',
          skippedSteps: row.skippedSteps,
          activityId: activity?.id ?? null,
          created
        },
        currentActivityId: activity?.id ?? null,
        payload: parseStoredPayload(JSON.parse(item.payload)),
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

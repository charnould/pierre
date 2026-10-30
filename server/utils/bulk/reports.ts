import { Database } from 'bun:sqlite'

import { activityTimestamp } from '../../../shared/activities'
import type {
  BulkExecutionMode,
  BulkItemReportStatus,
  BulkJobPayload,
  BulkOutcome,
  BulkReportCounts,
  BulkReportDetail,
  BulkReportItem,
  BulkReportSummary,
  BulkRunReportStatus,
  BulkSource
} from '../../../shared/bulk-operations'
import { insert_activity_row } from '../activities/rows'
import { openDatastore } from '../datastore-db'
import {
  bulkRunResult,
  bulkRunSummary,
  parseBulkRunContent,
  parseBulkRunSummaryContent,
  stringifyBulkRunSummaryContent
} from './run-content'
import {
  parseStoredOutcome,
  parseStoredPayload,
  storedOutcome,
  stringifyStoredPayload
} from './stored-job'

type RunRow = {
  id: number
  auteur: string
  bulk_id: string
  execution_id: string
  contenu: string
  date_creation: string
  completion_contenu: string | null
}

type ItemRow = {
  id: string
  execution_id: string
  item_id: string
  source: BulkSource
  mode: BulkExecutionMode
  report_status: BulkItemReportStatus
  outcome: string | null
  current_activity_id: number | null
  completed_at: string | null
  run_at: string | null
  attempts: number
  last_error: string | null
  payload: string
}

const parse_run = (row: RunRow, items: BulkReportItem[] = []): BulkReportSummary => {
  const content = parseBulkRunContent(row.contenu)
  const values = content.values
  const counts: BulkReportCounts = { total: 0, inProgress: 0, ok: 0, ko: 0 }
  for (const item of items) {
    counts[item.reportStatus === 'in_progress' ? 'inProgress' : item.reportStatus] += 1
    counts.total += 1
  }
  const persisted = row.completion_contenu
    ? bulkRunSummary(parseBulkRunSummaryContent(row.completion_contenu))
    : null
  let status: BulkRunReportStatus
  let reportCounts = counts
  let completedAt: string | null
  if (items.length > 0) {
    status =
      counts.inProgress > 0
        ? 'in_progress'
        : counts.ok === counts.total
          ? 'ok'
          : counts.ko === counts.total
            ? 'ko'
            : 'partial'
    completedAt =
      status === 'in_progress'
        ? null
        : (items
            .map((item) => item.completedAt)
            .filter((value): value is string => value !== null)
            .sort()
            .at(-1) ?? row.date_creation)
  } else if (persisted) {
    status = persisted.status
    reportCounts = persisted.counts
    completedAt = persisted.completedAt
  } else if (values.total === 0) {
    status = 'ok'
    completedAt = row.date_creation
  } else {
    throw new Error(`Bulk run ${row.execution_id} has no jobs or stored summary`)
  }
  return {
    bulkOperationId: row.bulk_id,
    executionId: row.execution_id,
    source: values.source,
    mode: values.mode,
    status,
    counts: reportCounts,
    confirmedAt: row.date_creation,
    completedAt,
    actor: row.auteur.replace(/^[^:]+:/, ''),
    result: bulkRunResult(content)
  }
}

const parse_item = (row: ItemRow): BulkReportItem => ({
  id: row.id,
  executionId: row.execution_id,
  itemId: row.item_id,
  source: row.source,
  mode: row.mode,
  reportStatus: row.report_status,
  outcome: row.outcome ? parseStoredOutcome(JSON.parse(row.outcome)) : null,
  currentActivityId: row.current_activity_id,
  completedAt: row.completed_at,
  runAt: row.run_at,
  attempts: row.attempts,
  lastError: row.last_error,
  payload: parseStoredPayload(JSON.parse(row.payload))
})

const items_for_execution = (db: Database, executionId: string): BulkReportItem[] =>
  db
    .query<ItemRow, [string]>(
      `SELECT id, execution_id, item_id, source, mode, report_status, outcome,
              current_activity_id, completed_at, run_at, attempts, last_error, payload
       FROM bulk_jobs
       WHERE execution_id = ?
       ORDER BY item_id`
    )
    .all(executionId)
    .map(parse_item)

const get_bulk_report_with_db = (
  db: Database,
  bulkOperationId: string,
  executionId: string
): BulkReportDetail | null => {
  const run = db
    .query<RunRow, [string, string]>(
      `SELECT run.id, run.auteur, run.bulk_id, run.execution_id, run.contenu,
              run.date_creation,
              (SELECT completion.contenu FROM activites completion
               WHERE completion.type = 'bulk.completed'
                 AND completion.execution_id = run.execution_id
               LIMIT 1) AS completion_contenu
       FROM activites run
       WHERE run.type = 'bulk.ran' AND run.bulk_id = ? AND run.execution_id = ?
       LIMIT 1`
    )
    .get(bulkOperationId, executionId)
  if (!run) return null
  const items = items_for_execution(db, executionId)
  return { report: parse_run(run, items), items }
}

export const get_bulk_report = (
  bulkOperationId: string,
  executionId: string
): BulkReportDetail | null => {
  const db = openDatastore({ readonly: true })
  try {
    return get_bulk_report_with_db(db, bulkOperationId, executionId)
  } finally {
    db.close()
  }
}

export const list_bulk_reports = (bulkOperationId: string): BulkReportDetail[] => {
  const db = openDatastore({ readonly: true })
  try {
    return db
      .query<RunRow, [string]>(
        `SELECT run.id, run.auteur, run.bulk_id, run.execution_id, run.contenu,
                run.date_creation,
                (SELECT completion.contenu FROM activites completion
                 WHERE completion.type = 'bulk.completed'
                   AND completion.execution_id = run.execution_id
                 LIMIT 1) AS completion_contenu
         FROM activites run
         WHERE run.type = 'bulk.ran' AND run.bulk_id = ?
         ORDER BY run.date_creation DESC, run.execution_id DESC`
      )
      .all(bulkOperationId)
      .map((run) => {
        const items = items_for_execution(db, run.execution_id)
        return { report: parse_run(run, items), items }
      })
  } finally {
    db.close()
  }
}

export const purge_completed_runs_with_db = (
  db: Database,
  bulkOperationId: string,
  reportsToKeep: number
): string[] => {
  const purged = db
    .query<{ execution_id: string }, [string, number]>(
      `SELECT run.execution_id
       FROM activites run
       WHERE run.type = 'bulk.ran' AND run.bulk_id = ?
         AND EXISTS (
           SELECT 1 FROM activites completion
           WHERE completion.type = 'bulk.completed'
             AND completion.execution_id = run.execution_id
         )
       ORDER BY COALESCE(
                  (SELECT completion.date_creation FROM activites completion
                   WHERE completion.type = 'bulk.completed'
                     AND completion.execution_id = run.execution_id
                   LIMIT 1),
                  run.date_creation
                ) DESC,
                run.execution_id DESC
       LIMIT -1 OFFSET ?`
    )
    .all(bulkOperationId, reportsToKeep)
    .map((row) => row.execution_id)
  for (const executionId of purged) {
    db.run('DELETE FROM bulk_jobs WHERE execution_id = ?', [executionId])
  }
  return purged
}

export const aggregate_bulk_run_with_db = (
  db: Database,
  executionId: string,
  terminalizedAt = activityTimestamp()
): BulkReportSummary | null => {
  const run = db
    .query<RunRow, [string]>(
      `SELECT run.id, run.auteur, run.bulk_id, run.execution_id, run.contenu,
              run.date_creation,
              (SELECT completion.contenu FROM activites completion
               WHERE completion.type = 'bulk.completed'
                 AND completion.execution_id = run.execution_id
               LIMIT 1) AS completion_contenu
       FROM activites run
       WHERE run.type = 'bulk.ran' AND run.execution_id = ?
       LIMIT 1`
    )
    .get(executionId)
  if (!run) return null
  const rows = db
    .query<{ report_status: BulkItemReportStatus; n: number }, [string]>(
      `SELECT report_status, COUNT(*) AS n
       FROM bulk_jobs
       WHERE execution_id = ?
       GROUP BY report_status`
    )
    .all(executionId)
  const counts: BulkReportCounts = { total: 0, inProgress: 0, ok: 0, ko: 0 }
  for (const row of rows) {
    counts[row.report_status === 'in_progress' ? 'inProgress' : row.report_status] = row.n
    counts.total += row.n
  }
  const status: BulkRunReportStatus =
    counts.inProgress > 0
      ? 'in_progress'
      : counts.total === 0 || counts.ok === counts.total
        ? 'ok'
        : counts.ko === counts.total
          ? 'ko'
          : 'partial'
  if (status !== 'in_progress') {
    if (!run.completion_contenu) {
      run.completion_contenu = stringifyBulkRunSummaryContent({
        version: 2,
        title: 'Exécution bulk terminée',
        values: {
          execution_id: executionId,
          report_status: status,
          count_in_progress: 0,
          count_ok: counts.ok,
          count_ko: counts.ko,
          completed_at: terminalizedAt
        }
      })
      insert_activity_row(db, {
        date_creation: terminalizedAt,
        rattachement: `bulk:${run.bulk_id}`,
        auteur: run.auteur,
        facets: { id_client: null, id_locataire: null, id_lot: null },
        type: 'bulk.completed',
        mentions: [],
        contenu: run.completion_contenu,
        bulk_id: run.bulk_id,
        execution_id: executionId,
        idempotency_key: `bulk:${executionId}:completed`
      })
    }
    const reportsToKeep =
      db
        .query<{ reports_to_keep: number }, [string]>(
          'SELECT reports_to_keep FROM bulk_operations WHERE id = ?'
        )
        .get(run.bulk_id)?.reports_to_keep ?? 10
    purge_completed_runs_with_db(db, run.bulk_id, reportsToKeep)
  }
  return parse_run(run, items_for_execution(db, executionId))
}

export const finalize_bulk_item_with_db = (
  db: Database,
  input: {
    jobId: string
    status: Extract<BulkItemReportStatus, 'ok' | 'ko'>
    outcome: BulkOutcome
    currentActivityId?: number | null
    payload?: BulkJobPayload
    completedAt?: string
  }
): BulkReportSummary | null => {
  const completedAt = input.completedAt ?? activityTimestamp()
  const row = db
    .query<{ execution_id: string }, [string]>('SELECT execution_id FROM bulk_jobs WHERE id = ?')
    .get(input.jobId)
  if (!row) return null
  db.run(
    `UPDATE bulk_jobs
     SET report_status = ?, outcome = ?, current_activity_id = COALESCE(?, current_activity_id),
         completed_at = ?, run_at = NULL, last_error = NULL,
         payload = COALESCE(?, payload)
     WHERE id = ?`,
    [
      input.status,
      JSON.stringify(storedOutcome(input.outcome)),
      input.currentActivityId ?? null,
      completedAt,
      input.payload ? stringifyStoredPayload(input.payload) : null,
      input.jobId
    ]
  )
  return aggregate_bulk_run_with_db(db, row.execution_id, completedAt)
}

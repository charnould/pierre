import { Database } from 'bun:sqlite'

import { activity_timestamp } from '../../../shared/activites'
import type {
  BulkExecutionMode,
  BulkItemReportStatus,
  BulkOperationExecuteResult,
  BulkReportCounts,
  BulkReportDetail,
  BulkReportItem,
  BulkReportSummary,
  BulkRunReportStatus,
  BulkSource
} from '../../../shared/bulk-operations'
import { datastorePaths } from '../paths'

const datastore_path = (): string => datastorePaths().database

type RunRow = {
  auteur: string
  bulk_id: string
  execution_id: string
  contenu: string
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

type RunContent = {
  source: BulkSource
  mode: BulkExecutionMode
  result: BulkOperationExecuteResult
  status: BulkRunReportStatus
  counts: BulkReportCounts
  completed_at: string | null
  snapshot: { confirmed_at: string }
}

const parse_object = (raw: string | null): Record<string, unknown> | null => {
  if (raw == null) return null
  try {
    const value = JSON.parse(raw)
    return value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const parse_run = (row: RunRow): BulkReportSummary => {
  const content = JSON.parse(row.contenu) as RunContent
  return {
    bulkOperationId: row.bulk_id,
    executionId: row.execution_id,
    source: content.source,
    mode: content.mode,
    status: content.status,
    counts: content.counts,
    confirmedAt: content.snapshot.confirmed_at,
    completedAt: content.completed_at,
    actor: row.auteur.replace(/^[^:]+:/, ''),
    result: content.result
  }
}

const parse_item = (row: ItemRow): BulkReportItem => ({
  id: row.id,
  executionId: row.execution_id,
  itemId: row.item_id,
  source: row.source,
  mode: row.mode,
  reportStatus: row.report_status,
  outcome: parse_object(row.outcome),
  currentActivityId: row.current_activity_id,
  completedAt: row.completed_at,
  runAt: row.run_at,
  attempts: row.attempts,
  lastError: row.last_error,
  payload: parse_object(row.payload) ?? {}
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
      `SELECT auteur, bulk_id, execution_id, contenu
       FROM activites
       WHERE type = 'bulk_run' AND bulk_id = ? AND execution_id = ?
       LIMIT 1`
    )
    .get(bulkOperationId, executionId)
  if (!run) return null
  return { report: parse_run(run), items: items_for_execution(db, executionId) }
}

export const get_bulk_report = (
  bulkOperationId: string,
  executionId: string
): BulkReportDetail | null => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return get_bulk_report_with_db(db, bulkOperationId, executionId)
  } finally {
    db.close()
  }
}

export const list_bulk_reports = (bulkOperationId: string): BulkReportDetail[] => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return db
      .query<RunRow, [string]>(
        `SELECT auteur, bulk_id, execution_id, contenu
         FROM activites
         WHERE type = 'bulk_run' AND bulk_id = ?
         ORDER BY COALESCE(
           json_extract(contenu, '$.completed_at'),
           json_extract(contenu, '$.snapshot.confirmed_at')
         ) DESC, execution_id DESC`
      )
      .all(bulkOperationId)
      .map((run) => ({
        report: parse_run(run),
        items: items_for_execution(db, run.execution_id)
      }))
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
      `SELECT execution_id
       FROM activites
       WHERE type = 'bulk_run'
         AND bulk_id = ?
         AND json_extract(contenu, '$.status') <> 'in_progress'
       ORDER BY json_extract(contenu, '$.completed_at') DESC, execution_id DESC
       LIMIT -1 OFFSET ?`
    )
    .all(bulkOperationId, reportsToKeep)
    .map((row) => row.execution_id)
  for (const executionId of purged) {
    db.run('DELETE FROM bulk_jobs WHERE execution_id = ?', [executionId])
    db.run(
      `DELETE FROM activites
       WHERE type = 'bulk_run' AND bulk_id = ? AND execution_id = ?`,
      [bulkOperationId, executionId]
    )
  }
  return purged
}

export const aggregate_bulk_run_with_db = (
  db: Database,
  executionId: string,
  terminalizedAt = activity_timestamp()
): BulkReportSummary | null => {
  const run = db
    .query<RunRow, [string]>(
      `SELECT auteur, bulk_id, execution_id, contenu
       FROM activites
       WHERE type = 'bulk_run' AND execution_id = ?
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
  const counts: BulkReportCounts = { total: 0, in_progress: 0, ok: 0, ko: 0 }
  for (const row of rows) {
    counts[row.report_status] = row.n
    counts.total += row.n
  }
  const status: BulkRunReportStatus =
    counts.in_progress > 0
      ? 'in_progress'
      : counts.total === 0 || counts.ok === counts.total
        ? 'ok'
        : counts.ko === counts.total
          ? 'ko'
          : 'partial'
  const content = JSON.parse(run.contenu) as RunContent
  const completedAt = status === 'in_progress' ? null : (content.completed_at ?? terminalizedAt)
  db.run('UPDATE activites SET contenu = ? WHERE type = ? AND execution_id = ?', [
    JSON.stringify({ ...content, status, counts, completed_at: completedAt }),
    'bulk_run',
    executionId
  ])
  if (status !== 'in_progress') {
    const reportsToKeep =
      db
        .query<{ reports_to_keep: number }, [string]>(
          'SELECT reports_to_keep FROM bulk_operations WHERE id = ?'
        )
        .get(run.bulk_id)?.reports_to_keep ?? 10
    purge_completed_runs_with_db(db, run.bulk_id, reportsToKeep)
  }
  return parse_run({
    ...run,
    contenu: JSON.stringify({ ...content, status, counts, completed_at: completedAt })
  })
}

export const finalize_bulk_item_with_db = (
  db: Database,
  input: {
    jobId: string
    status: Extract<BulkItemReportStatus, 'ok' | 'ko'>
    outcome: Record<string, unknown>
    currentActivityId?: number | null
    payload?: Record<string, unknown>
    completedAt?: string
  }
): BulkReportSummary | null => {
  const completedAt = input.completedAt ?? activity_timestamp()
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
      JSON.stringify(input.outcome),
      input.currentActivityId ?? null,
      completedAt,
      input.payload ? JSON.stringify(input.payload) : null,
      input.jobId
    ]
  )
  return aggregate_bulk_run_with_db(db, row.execution_id, completedAt)
}

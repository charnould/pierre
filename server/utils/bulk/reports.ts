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
  date_creation: string
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

const parse_run = (row: RunRow, items: BulkReportItem[] = []): BulkReportSummary => {
  const raw = JSON.parse(row.contenu) as RunContent & {
    values?: {
      source?: BulkSource
      mode?: BulkExecutionMode
      execution_id?: string
      total?: number
      queued?: number
      no_usable_route?: number
      applied?: number
    }
    snapshot?: { confirmed_at?: string }
  }
  const values = raw.values
  const counts: BulkReportCounts = { total: 0, in_progress: 0, ok: 0, ko: 0 }
  for (const item of items) {
    counts[item.reportStatus] += 1
    counts.total += 1
  }
  const status: BulkRunReportStatus =
    items.length === 0
      ? (raw.status ?? 'in_progress')
      : counts.in_progress > 0
        ? 'in_progress'
        : counts.ok === counts.total
          ? 'ok'
          : counts.ko === counts.total
            ? 'ko'
            : 'partial'
  const source = values?.source ?? raw.source
  const mode = values?.mode ?? raw.mode
  return {
    bulkOperationId: row.bulk_id,
    executionId: row.execution_id,
    source,
    mode,
    status,
    counts: items.length > 0 ? counts : (raw.counts ?? counts),
    confirmedAt: raw.snapshot?.confirmed_at ?? row.date_creation,
    completedAt: status === 'in_progress' ? null : (raw.completed_at ?? row.date_creation),
    actor: row.auteur.replace(/^[^:]+:/, ''),
    result: raw.result ?? {
      execution_id: row.execution_id,
      totals: {
        total: values?.total ?? counts.total,
        queued: values?.queued ?? 0,
        no_usable_route: values?.no_usable_route ?? 0,
        applied: values?.applied ?? 0
      }
    }
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
      `SELECT auteur, bulk_id, execution_id, contenu, date_creation
       FROM activites
       WHERE type = 'bulk.ran' AND bulk_id = ? AND execution_id = ?
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
        `SELECT auteur, bulk_id, execution_id, contenu, date_creation
         FROM activites
         WHERE type = 'bulk.ran' AND bulk_id = ?
         ORDER BY date_creation DESC, execution_id DESC`
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
      `SELECT execution_id
       FROM activites
       WHERE type = 'bulk.ran'
         AND bulk_id = ?
         AND json_extract(contenu, '$.values.mode') IS NOT NULL
       ORDER BY json_extract(contenu, '$.completed_at') DESC, execution_id DESC
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
  terminalizedAt = activity_timestamp()
): BulkReportSummary | null => {
  const run = db
    .query<RunRow, [string]>(
      `SELECT auteur, bulk_id, execution_id, contenu, date_creation
       FROM activites
       WHERE type = 'bulk.ran' AND execution_id = ?
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
  if (status !== 'in_progress') {
    const reportsToKeep =
      db
        .query<{ reports_to_keep: number }, [string]>(
          'SELECT reports_to_keep FROM bulk_operations WHERE id = ?'
        )
        .get(run.bulk_id)?.reports_to_keep ?? 10
    purge_completed_runs_with_db(db, run.bulk_id, reportsToKeep)
  }
  void terminalizedAt
  return parse_run(run, items_for_execution(db, executionId))
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

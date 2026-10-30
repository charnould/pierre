import { Database } from 'bun:sqlite'

import { z } from 'zod'

import { activityTimestamp } from '../../../shared/activities'
import {
  type BulkOperationEdit,
  type BulkOperationRecord,
  type BulkOperationSummary,
  type CreateBulkOperationBody,
  lastBulkOperationEdit,
  type PatchBulkOperationBody
} from '../../../shared/bulk-operations'
import { project_communication_status_with_db } from '../communications/status'
import { openDatastore } from '../datastore-db'
import { BulkOperationDefinitionSchema, BulkQueryError } from './query'
import { purge_completed_runs_with_db } from './reports'
import { parseStoredDefinition, stringifyStoredDefinition } from './stored-definition'

export class BulkOperationsError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'forbidden' | 'invalid' | 'conflict' = 'invalid'
  ) {
    super(message)
    this.name = 'BulkOperationsError'
  }
}

export const CreateBulkOperationBodySchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().default(''),
    definition: BulkOperationDefinitionSchema,
    reportsToKeep: z.number().int().min(1).default(10)
  })
  .strict()

export const PatchBulkOperationBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    definition: BulkOperationDefinitionSchema.optional(),
    reportsToKeep: z.number().int().min(1).optional()
  })
  .strict()

type DbRow = {
  id: string
  name: string
  description: string
  definition: string
  reports_to_keep: number
  edits: string
}

type SummaryDbRow = Omit<DbRow, 'definition'>

const BulkEditSchema = z
  .object({
    by: z.string().min(1),
    at: z.iso.datetime()
  })
  .strict()

const parse_edits = (raw: string): BulkOperationEdit[] =>
  z.array(BulkEditSchema).parse(JSON.parse(raw))

const append_edit = (edits: BulkOperationEdit[], by: string): BulkOperationEdit[] => [
  ...edits,
  { by, at: activityTimestamp() }
]

const last_run_by_id = (db: Database, ids: string[]): Map<string, string> => {
  const result = new Map<string, string>()
  if (ids.length === 0) return result
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<{ bulk_id: string; last_at: string }, string[]>(
      `SELECT bulk_id, MAX(date_creation) AS last_at
       FROM activites
       WHERE type = 'bulk.ran' AND bulk_id IN (${placeholders})
       GROUP BY bulk_id`
    )
    .all(...ids)
  for (const row of rows) result.set(row.bulk_id, row.last_at)
  return result
}

const row_to_record = (row: DbRow, lastRunAt: string | null): BulkOperationRecord => ({
  id: row.id,
  name: row.name,
  description: row.description,
  definition: parseStoredDefinition(JSON.parse(row.definition)),
  reportsToKeep: row.reports_to_keep,
  edits: parse_edits(row.edits),
  lastRunAt
})

const row_to_summary = (row: SummaryDbRow, lastRunAt: string | null): BulkOperationSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  reportsToKeep: row.reports_to_keep,
  edits: parse_edits(row.edits),
  lastRunAt
})

export const get_bulk_operation_with_db = (
  db: Database,
  id: string
): BulkOperationRecord | null => {
  const row = db
    .query<DbRow, [string]>('SELECT * FROM bulk_operations WHERE id = ? LIMIT 1')
    .get(id)
  if (!row) return null
  return row_to_record(row, last_run_by_id(db, [id]).get(id) ?? null)
}

export const list_bulk_operations = (): BulkOperationSummary[] => {
  const db = openDatastore({ readonly: true })
  try {
    const rows = db
      .query<SummaryDbRow, []>(
        `SELECT id, name, description, reports_to_keep, edits
         FROM bulk_operations`
      )
      .all()
    const lastRuns = last_run_by_id(
      db,
      rows.map((row) => row.id)
    )
    return rows
      .map((row) => row_to_summary(row, lastRuns.get(row.id) ?? null))
      .sort((a, b) => {
        const aAt = lastBulkOperationEdit(a.edits)?.at ?? ''
        const bAt = lastBulkOperationEdit(b.edits)?.at ?? ''
        return bAt.localeCompare(aAt)
      })
  } finally {
    db.close()
  }
}

export const get_bulk_operation = (id: string): BulkOperationRecord | null => {
  const db = openDatastore({ readonly: true })
  try {
    return get_bulk_operation_with_db(db, id)
  } finally {
    db.close()
  }
}

export const create_bulk_operation = (
  actor: string,
  body: CreateBulkOperationBody
): BulkOperationRecord => {
  const parsed = CreateBulkOperationBodySchema.parse(body)
  const id = Bun.randomUUIDv7()
  const db = openDatastore()
  try {
    db.run(
      `INSERT INTO bulk_operations
       (id, name, description, definition, reports_to_keep, edits)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.name,
        parsed.description,
        stringifyStoredDefinition(parsed.definition),
        parsed.reportsToKeep,
        JSON.stringify(append_edit([], actor))
      ]
    )
    return get_bulk_operation_with_db(db, id)!
  } catch (error) {
    if (error instanceof BulkQueryError) {
      throw new BulkOperationsError(error.message, 'invalid')
    }
    throw error
  } finally {
    db.close()
  }
}

export const update_bulk_operation = (
  id: string,
  actor: string,
  patch: PatchBulkOperationBody
): BulkOperationRecord => {
  const parsed = PatchBulkOperationBodySchema.parse(patch)
  const db = openDatastore()
  try {
    db.run('BEGIN IMMEDIATE')
    const existing = get_bulk_operation_with_db(db, id)
    if (!existing) throw new BulkOperationsError('Bulk operation not found', 'not_found')
    const definition = parsed.definition ?? existing.definition
    const storedDefinition = stringifyStoredDefinition(definition)
    const definitionChanged =
      parsed.definition !== undefined &&
      storedDefinition !== stringifyStoredDefinition(existing.definition)
    if (
      definitionChanged &&
      db
        .query<{ present: number }, [string]>(
          `SELECT 1 AS present
           FROM bulk_jobs
           WHERE bulk_operation_id = ? AND report_status = 'in_progress'
           LIMIT 1`
        )
        .get(id)
    ) {
      throw new BulkOperationsError(
        'Definition cannot be changed while a run is in progress',
        'conflict'
      )
    }
    db.run(
      `UPDATE bulk_operations
       SET name = ?, description = ?, definition = ?, reports_to_keep = ?, edits = ?
       WHERE id = ?`,
      [
        parsed.name ?? existing.name,
        parsed.description ?? existing.description,
        storedDefinition,
        parsed.reportsToKeep ?? existing.reportsToKeep,
        JSON.stringify(append_edit(existing.edits, actor)),
        id
      ]
    )
    if (parsed.reportsToKeep != null && parsed.reportsToKeep < existing.reportsToKeep) {
      purge_completed_runs_with_db(db, id, parsed.reportsToKeep)
    }
    const updated = get_bulk_operation_with_db(db, id)!
    db.run('COMMIT')
    return updated
  } catch (error) {
    db.run('ROLLBACK')
    if (error instanceof BulkQueryError) {
      throw new BulkOperationsError(error.message, 'invalid')
    }
    throw error
  } finally {
    db.close()
  }
}

export const delete_bulk_operation = (id: string): BulkOperationRecord => {
  const db = openDatastore()
  try {
    db.run('BEGIN IMMEDIATE')
    const existing = get_bulk_operation_with_db(db, id)
    if (!existing) throw new BulkOperationsError('Bulk operation not found', 'not_found')
    const now = activityTimestamp()
    const pendingCommunications = db
      .query<{ id: number }, [string]>(
        `SELECT id FROM activites
         WHERE bulk_id = ?
           AND type = 'communication.sent'
           AND thread_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM activites status
             WHERE status.thread_id = activites.thread_id
               AND (
                 status.type = 'communication.failed'
                 OR (
                   status.type = 'communication.ok'
                   AND json_extract(status.contenu, '$.result') IS NOT 'sent'
                 )
               )
           )`
      )
      .all(id)
    for (const activity of pendingCommunications) {
      project_communication_status_with_db(db, {
        activity_id: activity.id,
        statut: 'failed',
        reason: 'bulk_operation_deleted',
        occurred_at: now
      })
    }
    db.run('DELETE FROM bulk_jobs WHERE bulk_operation_id = ?', [id])
    db.run('DELETE FROM bulk_operations WHERE id = ?', [id])
    db.run('COMMIT')
    return existing
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

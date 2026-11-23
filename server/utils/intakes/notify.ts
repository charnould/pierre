import { Database } from 'bun:sqlite'

import type { ActivityValue } from '../../../shared/activities'
import type { IntakeSubmittedContent, IntakeSubmittedFile } from '../../../shared/activity-content'
import {
  type IntakeField,
  intakeFieldColumnName,
  type IntakeRecord,
  intakeTableName,
  isIntakeInputField
} from '../../../shared/intakes'
import { isRecurrenceSchedule } from '../../../shared/schedule'
import { create_trusted_activity } from '../activities/write'
import { notificationRecipients, parseMentionsJson } from '../collaborator-access'
import { openDatastore } from '../datastore-db'
import { computeNextOccurrence, nextMinuteBoundary } from '../schedule'
import { timezone } from '../setup-store'
import { manifestToSubmittedFiles, parseIntakeFilesEnvelope } from './files'
import { parseStoredIntakeConfig } from './schemas'
import { intakeBusinessColumns, parseIntakeJsonArray, quoteSqlIdent } from './table'

export type SubmittedRowSummary = {
  id: string
  dateCreation: string
  values: Record<string, ActivityValue>
  files: IntakeSubmittedFile[]
}

function formatFieldActivityValue(field: IntakeField, raw: unknown): ActivityValue {
  if (raw === null || raw === undefined || raw === '') return null
  if (field.type === 'checkbox') return Number(raw) === 1 ? 'Oui' : 'Non'
  if (field.type === 'multiple_choice' || field.type === 'file') {
    return parseIntakeJsonArray(raw) ?? String(raw)
  }
  if (field.type === 'number') {
    return typeof raw === 'number' ? raw : Number(raw)
  }
  return String(raw)
}

export function buildSubmissionActivityValues(
  submissionId: string,
  fields: readonly IntakeField[],
  columnValues: Record<string, unknown>
): Record<string, ActivityValue> {
  const values: Record<string, ActivityValue> = {
    Référence: submissionId
  }
  for (const field of fields) {
    if (!isIntakeInputField(field)) continue
    const col = intakeFieldColumnName(field.label)
    const formatted = formatFieldActivityValue(field, columnValues[col])
    if (formatted !== null) values[field.label] = formatted
  }
  return values
}

function buildSingleSubmissionContent(
  title: string,
  submission: SubmittedRowSummary
): IntakeSubmittedContent {
  return {
    version: 1,
    title,
    values: submission.values,
    submissionId: submission.id,
    ...(submission.files.length > 0 ? { files: submission.files } : {})
  }
}

function emitIntakeActivity(
  intake: Pick<IntakeRecord, 'id' | 'owner' | 'mentions'>,
  content: IntakeSubmittedContent,
  db?: Database
): void {
  const recipients = notificationRecipients(intake.owner, intake.mentions)
  if (recipients.length === 0) return
  create_trusted_activity(
    intake.owner,
    {
      contexte: 'intake',
      ref: intake.id,
      type: 'intake.submitted',
      recipients,
      contenu: JSON.stringify(content),
      auteur: `intake:${intake.id}`
    },
    db
  )
}

export function notifyImmediateIntakeSubmission(
  intake: Pick<IntakeRecord, 'id' | 'name' | 'owner' | 'mentions' | 'config'>,
  submission: SubmittedRowSummary,
  db?: Database
): void {
  if (intake.config.notifications.frequency !== 'immediate') return
  emitIntakeActivity(intake, buildSingleSubmissionContent(intake.name, submission), db)
}

function formatPeriodDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(iso))
}

function readSingleSubmissionFromDb(
  db: Database,
  tableName: string,
  fields: readonly IntakeField[],
  rowId: string
): SubmittedRowSummary | null {
  const physical = quoteSqlIdent(intakeTableName(tableName))
  const selectCols = ['id', 'date_creation', ...intakeBusinessColumns(fields), '_files']
    .map(quoteSqlIdent)
    .join(', ')
  const row = db
    .query<Record<string, unknown>, [string]>(
      `SELECT ${selectCols} FROM ${physical} WHERE id = ? LIMIT 1`
    )
    .get(rowId)
  if (!row) return null

  const filesBlob = row['_files'] as Uint8Array | null | undefined
  const files = filesBlob
    ? manifestToSubmittedFiles(parseIntakeFilesEnvelope(filesBlob).manifest)
    : []

  return {
    id: String(row['id']),
    dateCreation: String(row['date_creation']),
    values: buildSubmissionActivityValues(String(row['id']), fields, row),
    files
  }
}

type DigestIntakeRow = {
  id: string
  name: string
  table_name: string
  owner: string
  mentions: string
  config: string
  published_at: string
  closed_at: string | null
  last_notified_at: string | null
}

/**
 * Minute cron job (`* * * * *`) emitting scheduled intake notification digests.
 * Uses persisted `next_notify_at` (same recurrence engine as automations) and advances
 * strictly to `nextMinuteBoundary(now)` so a slot never fires twice.
 */
export function run_due_intake_digests(now: Date = new Date()): number {
  const zone = timezone()
  const nowIso = now.toISOString()
  using db = openDatastore()
  let emitted = 0

  const candidateIds = db
    .query<{ id: string }, [string]>(
      `SELECT id FROM intakes
       WHERE published_at IS NOT NULL
         AND next_notify_at IS NOT NULL
         AND next_notify_at <= ?`
    )
    .all(nowIso)
    .map((row) => row.id)

  for (const intakeId of candidateIds) {
    try {
      const didEmit = db
        .transaction(() => {
          const row = db
            .query<DigestIntakeRow, [string, string]>(
              `SELECT id, name, table_name, owner, mentions, config, published_at, closed_at, last_notified_at
               FROM intakes
               WHERE id = ?
                 AND published_at IS NOT NULL
                 AND next_notify_at IS NOT NULL
                 AND next_notify_at <= ?
               LIMIT 1`
            )
            .get(intakeId, nowIso)
          if (!row) return false

          const config = parseStoredIntakeConfig(row.config)
          const notif = config.notifications
          if (!isRecurrenceSchedule(notif)) {
            db.run('UPDATE intakes SET next_notify_at = NULL WHERE id = ?', [row.id])
            return false
          }

          const nextNotifyAt =
            row.closed_at !== null
              ? null
              : computeNextOccurrence(notif, zone, nextMinuteBoundary(now))

          const cursor = row.last_notified_at ?? row.published_at
          const physical = quoteSqlIdent(intakeTableName(row.table_name))
          const stats = db
            .query<
              {
                count: number
                first_at: string | null
                last_at: string | null
                single_id: string | null
              },
              [string]
            >(
              `SELECT COUNT(*) AS count,
                      MIN(date_creation) AS first_at,
                      MAX(date_creation) AS last_at,
                      MIN(id) AS single_id
               FROM ${physical}
               WHERE date_creation > ?`
            )
            .get(cursor)

          const count = Number(stats?.count ?? 0)
          if (count === 0 || !stats?.last_at) {
            db.run('UPDATE intakes SET next_notify_at = ? WHERE id = ?', [nextNotifyAt, row.id])
            return false
          }

          const nextCursor = stats.last_at > nowIso ? stats.last_at : nowIso
          const intakeRef = {
            id: row.id,
            owner: row.owner,
            mentions: parseMentionsJson(row.mentions)
          }

          let content: IntakeSubmittedContent | null
          if (count === 1 && stats.single_id) {
            const single = readSingleSubmissionFromDb(
              db,
              row.table_name,
              config.form.fields,
              stats.single_id
            )
            content = single ? buildSingleSubmissionContent(row.name, single) : null
          } else {
            content = {
              version: 1,
              title: row.name,
              values: {
                'Nouvelles réponses': count,
                Période: `${formatPeriodDate(stats.first_at ?? cursor, zone)} → ${formatPeriodDate(stats.last_at, zone)}`
              },
              note: `${count} nouvelles réponses reçues sur la collecte « ${row.name} ».`
            }
          }

          if (content) emitIntakeActivity(intakeRef, content, db)
          db.run('UPDATE intakes SET last_notified_at = ?, next_notify_at = ? WHERE id = ?', [
            nextCursor,
            nextNotifyAt,
            row.id
          ])
          return content !== null
        })
        .immediate()
      if (didEmit) emitted += 1
    } catch (error) {
      console.error(`[intakes.digest] failed for ${intakeId}`, error)
    }
  }

  return emitted
}

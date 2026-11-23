import { type IntakeRecord, intakeTableName } from '../../../shared/intakes'
import {
  canSeeCollaboratorResource,
  type CollaboratorActor,
  parseMentionsJson
} from '../collaborator-access'
import { openDatastore } from '../datastore-db'
import { IntakesError } from './errors'
import {
  extractIntakeFile,
  type IntakeUploadFile,
  manifestToSubmittedFiles,
  packIntakeFilesBlob
} from './files'
import {
  type IntakeKnowledgeRebuildMode,
  syncIntakeKnowledgeRowInDb,
  triggerIntakeKnowledgeRebuild
} from './knowledge'
import { buildSubmissionActivityValues, notifyImmediateIntakeSubmission } from './notify'
import { parseStoredIntakeConfig } from './schemas'
import { getIntakeRowById, type IntakeDbRow } from './store'
import { intakeBusinessColumns, quoteSqlIdent } from './table'

export type RecordSubmissionResult = {
  id: string
  duplicate: boolean
}

/**
 * Atomically records a validated submission (data + `_files BLOB`), syncs the knowledge source
 * revision, and emits any immediate notification inside one SQLite write transaction.
 * Re-reads the active intake row inside the transaction (matching its token) so concurrent
 * edits, revocations or closures are honored, and handles idempotency on `submissionId`.
 */
export function record_intake_submission(
  intake: Pick<IntakeRecord, 'id' | 'token'>,
  input: {
    submissionId: string
    columnValues: Record<string, string | number | null>
    files: readonly IntakeUploadFile[]
  }
): RecordSubmissionResult {
  if (!intake.token) {
    throw new IntakesError('Collecte introuvable', 'not_found')
  }

  let duplicate = false
  let rebuild: IntakeKnowledgeRebuildMode = 'none'

  using db = openDatastore()
  db.transaction(() => {
    const active = db
      .query<IntakeDbRow, [string, string]>(
        `SELECT * FROM intakes
         WHERE id = ? AND token = ? AND published_at IS NOT NULL AND closed_at IS NULL
         LIMIT 1`
      )
      .get(intake.id, intake.token!)
    if (!active) {
      throw new IntakesError('Collecte introuvable', 'not_found')
    }

    const physical = quoteSqlIdent(intakeTableName(active.table_name))
    const already = db
      .query<{ id: string }, [string]>(`SELECT id FROM ${physical} WHERE id = ? LIMIT 1`)
      .get(input.submissionId)
    if (already) {
      duplicate = true
      return
    }

    const { blob, manifest } = packIntakeFilesBlob(input.files)
    const fileSummaries = manifestToSubmittedFiles(manifest)
    const activeConfig = parseStoredIntakeConfig(active.config)
    const dateCreation = new Date().toISOString()
    const businessCols = intakeBusinessColumns(activeConfig.form.fields)
    const cols = [
      'id',
      'date_creation',
      'rattachement',
      'id_client',
      'id_locataire',
      'id_lot',
      ...businessCols,
      '_files'
    ]
    const placeholders = cols.map(() => '?').join(', ')
    const params: Array<string | number | Uint8Array | null> = [
      input.submissionId,
      dateCreation,
      null,
      null,
      null,
      null,
      ...businessCols.map((col) => input.columnValues[col] ?? null),
      blob
    ]

    db.run(
      `INSERT INTO ${physical} (${cols.map(quoteSqlIdent).join(', ')}) VALUES (${placeholders})`,
      params
    )

    if (active.publish_to_knowledge === 1) {
      rebuild = syncIntakeKnowledgeRowInDb(db, active)
    }

    notifyImmediateIntakeSubmission(
      {
        id: active.id,
        name: active.name,
        owner: active.owner,
        mentions: parseMentionsJson(active.mentions),
        config: activeConfig
      },
      {
        id: input.submissionId,
        dateCreation,
        values: buildSubmissionActivityValues(
          input.submissionId,
          activeConfig.form.fields,
          input.columnValues
        ),
        files: fileSummaries
      },
      db
    )
  }).immediate()

  if (duplicate) {
    return { id: input.submissionId, duplicate: true }
  }

  triggerIntakeKnowledgeRebuild(rebuild)
  return { id: input.submissionId, duplicate: false }
}

export function get_intake_submission_file(
  intakeId: string,
  submissionId: string,
  filename: string,
  actor: CollaboratorActor
): { filename: string; mimeType: string; bytes: Uint8Array } | null {
  using db = openDatastore({ readonly: true })
  const row = getIntakeRowById(db, intakeId)
  if (!row || row.published_at === null) return null
  if (!canSeeCollaboratorResource(row.owner, parseMentionsJson(row.mentions), actor)) {
    return null
  }
  const sub = db
    .query<{ _files: Uint8Array | null }, [string]>(
      `SELECT _files FROM ${quoteSqlIdent(intakeTableName(row.table_name))} WHERE id = ? LIMIT 1`
    )
    .get(submissionId)
  if (!sub?._files) return null
  const extracted = extractIntakeFile(sub._files, filename)
  if (!extracted) return null
  return {
    filename: extracted.entry.filename,
    mimeType: extracted.entry.mimeType,
    bytes: extracted.bytes
  }
}

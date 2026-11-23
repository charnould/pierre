import PizZip from 'pizzip'

import { type IntakeInputField, intakeTableName } from '../../../shared/intakes'
import {
  canSeeCollaboratorResource,
  type CollaboratorActor,
  parseMentionsJson
} from '../collaborator-access'
import { openDatastore } from '../datastore-db'
import { IntakesError } from './errors'
import { unpackAllIntakeFiles } from './files'
import { parseColumnTypesJson } from './schemas'
import { getIntakeRowById } from './store'
import { parseIntakeJsonArray, quoteSqlIdent } from './table'

const SYSTEM_EXPORT_COLUMNS = [
  'id',
  'date_creation',
  'rattachement',
  'id_client',
  'id_locataire',
  'id_lot'
] as const

const FORMULA_TRIGGER = /^[=+\-@\t\r]/

/** Anti-spreadsheet formula injection + RFC 4180 semicolon CSV escaping. */
export function escapeCsvCell(raw: string): string {
  const safe = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw
  if (safe.includes(';') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replaceAll('"', '""')}"`
  }
  return safe
}

function formatCellForCsv(
  submissionId: string,
  value: unknown,
  fieldType: IntakeInputField['type'] | undefined
): string {
  if (value === null || value === undefined) return ''
  if (fieldType === 'checkbox') return Number(value) === 1 ? 'oui' : 'non'
  if (fieldType === 'file') {
    const items = parseIntakeJsonArray(value)
    return items ? items.map((name) => `fichiers/${submissionId}/${name}`).join('|') : String(value)
  }
  if (fieldType === 'multiple_choice') {
    const items = parseIntakeJsonArray(value)
    return items ? items.join('|') : String(value)
  }
  return String(value)
}

/**
 * Generates `{table_name}.zip` for an authorized actor in a single read connection:
 * - `{table_name}.csv` (UTF-8 BOM, `;`, CRLF, anti-injection `'`, no `_files`)
 * - `fichiers/{id}/{filename}` for every attachment in `_files BLOB`
 */
export function export_intake_zip(
  id: string,
  actor: CollaboratorActor
): { filename: string; bytes: Uint8Array } {
  const zip = new PizZip()
  let tableName: string

  {
    using db = openDatastore({ readonly: true })
    const row = getIntakeRowById(db, id)
    if (!row || !canSeeCollaboratorResource(row.owner, parseMentionsJson(row.mentions), actor)) {
      throw new IntakesError('Collecte introuvable', 'not_found')
    }
    if (row.published_at === null) {
      throw new IntakesError('La collecte n’est pas encore publiée', 'conflict')
    }

    tableName = row.table_name
    const columnTypes = parseColumnTypesJson(row.column_types)
    const orderedCols = [...SYSTEM_EXPORT_COLUMNS, ...Object.keys(columnTypes)]
    const selectCols = [...orderedCols, '_files'].map(quoteSqlIdent).join(', ')
    const query = db.query<Record<string, unknown>, []>(
      `SELECT ${selectCols} FROM ${quoteSqlIdent(intakeTableName(tableName))} ORDER BY date_creation DESC`
    )

    const lines: string[] = [orderedCols.map(escapeCsvCell).join(';')]
    for (const submission of query.iterate()) {
      const submissionId = String(submission['id'] ?? '')
      const filesBlob = submission['_files'] as Uint8Array | null | undefined
      if (filesBlob && filesBlob.byteLength > 0) {
        for (const { entry, bytes } of unpackAllIntakeFiles(filesBlob)) {
          zip.file(`fichiers/${submissionId}/${entry.filename}`, bytes, { compression: 'STORE' })
        }
      }

      const csvRow = orderedCols.map((col) =>
        escapeCsvCell(formatCellForCsv(submissionId, submission[col], columnTypes[col]))
      )
      lines.push(csvRow.join(';'))
    }

    zip.file(`${tableName}.csv`, `\uFEFF${lines.join('\r\n')}\r\n`, {
      compression: 'DEFLATE'
    })
  }

  return {
    filename: `${tableName}.zip`,
    bytes: zip.generate({ type: 'uint8array' })
  }
}

import { Database } from 'bun:sqlite'

import {
  type IntakeField,
  intakeFieldColumnName,
  intakeTableName,
  isIntakeInputField
} from '../../../shared/intakes'

export const quoteSqlIdent = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`

export const intakeBusinessColumns = (fields: readonly IntakeField[]): string[] =>
  fields.filter(isIntakeInputField).map((field) => intakeFieldColumnName(field.label))

export function parseIntakeJsonArray(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

export function sqlColumnDefinition(field: IntakeField): string | null {
  if (!isIntakeInputField(field)) return null
  const column = intakeFieldColumnName(field.label)
  const quoted = quoteSqlIdent(column)
  switch (field.type) {
    case 'number':
      return `${quoted} REAL`
    case 'multiple_choice':
    case 'file':
      return `${quoted} TEXT CHECK (${quoted} IS NULL OR json_valid(${quoted}))`
    case 'checkbox':
      return `${quoted} INTEGER CHECK (${quoted} IS NULL OR ${quoted} IN (0, 1))`
    case 'short_text':
    case 'long_text':
    case 'date':
    case 'datetime':
    case 'email':
    case 'phone':
    case 'single_choice':
      return `${quoted} TEXT`
  }
}

export function createIntakeTable(
  db: Database,
  tableName: string,
  fields: readonly IntakeField[]
): void {
  const physical = intakeTableName(tableName)
  const quotedTable = quoteSqlIdent(physical)
  const userColumns = fields
    .map(sqlColumnDefinition)
    .filter((definition): definition is string => definition !== null)

  const columns = [
    'id TEXT PRIMARY KEY NOT NULL',
    'date_creation TEXT NOT NULL',
    'rattachement TEXT',
    'id_client TEXT',
    'id_locataire TEXT',
    'id_lot TEXT',
    ...userColumns,
    '_files BLOB'
  ]

  db.run(`CREATE TABLE ${quotedTable} (\n  ${columns.join(',\n  ')}\n) STRICT`)
  db.run(
    `CREATE INDEX ${quoteSqlIdent(`idx_${physical}_date_creation`)} ON ${quotedTable} (date_creation DESC)`
  )
  for (const facet of ['rattachement', 'id_client', 'id_locataire', 'id_lot'] as const) {
    db.run(
      `CREATE INDEX ${quoteSqlIdent(`idx_${physical}_${facet}`)} ON ${quotedTable} (${facet}) WHERE ${facet} IS NOT NULL`
    )
  }
}

export function addIntakeColumns(
  db: Database,
  tableName: string,
  fields: readonly IntakeField[]
): void {
  const quotedTable = quoteSqlIdent(intakeTableName(tableName))
  for (const field of fields) {
    const def = sqlColumnDefinition(field)
    if (!def) continue
    db.run(`ALTER TABLE ${quotedTable} ADD COLUMN ${def}`)
  }
}

export function intakeTableExists(db: Database, tableName: string): boolean {
  const row = db
    .query<{ n: number }, [string]>(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(intakeTableName(tableName))
  return (row?.n ?? 0) === 1
}

/** Never touches `_files BLOB`. Caller guarantees the published intake table exists. */
export function intakeTableStats(
  db: Database,
  tableName: string
): { count: number; lastSubmissionAt: string | null } {
  const row = db
    .query<{ count: number; last_at: string | null }, []>(
      `SELECT COUNT(*) AS count, MAX(date_creation) AS last_at FROM ${quoteSqlIdent(intakeTableName(tableName))}`
    )
    .get()
  return {
    count: Number(row?.count ?? 0),
    lastSubmissionAt: row?.last_at ?? null
  }
}

/**
 * Deterministic SHA-256 revision hash of an intake table's published state
 * (row count, latest submission timestamp, description, columns) for Knowledge builds.
 */
export function intakeKnowledgeRevisionHash(
  db: Database,
  tableName: string,
  description: string,
  columns: readonly string[]
): string {
  const stats = intakeTableStats(db, tableName)
  const payload = JSON.stringify({
    tableName,
    description,
    columns,
    count: stats.count,
    lastSubmissionAt: stats.lastSubmissionAt
  })
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex')
}

import { Database } from 'bun:sqlite'

import { insert_contacts_from_rows } from '../contacts'
import {
  COMMUNES_PAR_CODE_POSTAL_TABLE,
  import_communes_par_code_postal_table,
  is_code_postal_column,
  is_keep_as_text_column,
  normalize_code_postal,
  stringify_identifier
} from './codes-postaux'
import { normalize_knowledge_name } from './utils'

/** A single JSON object row eligible for tabular import. */
export type JsonRow = Record<string, unknown>

const quote_identifier = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`

/**
 * Returns a non-empty, unique SQLite identifier for each input key.
 */
const build_unique_sql_identifiers = (keys: string[]): string[] => {
  const seen = new Map<string, number>()

  return keys.map((key) => {
    const base_identifier = normalize_knowledge_name(key) || 'column'
    const occurrence = seen.get(base_identifier) ?? 0
    seen.set(base_identifier, occurrence + 1)
    return occurrence === 0 ? base_identifier : `${base_identifier}_${occurrence + 1}`
  })
}

const table_exists = (db: Database, table: string): boolean =>
  db
    .query<{ n: number }, [string]>(
      `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .get(table)!.n === 1

const existing_reclamations = (db: Database, table: string): Map<string, JsonRow> => {
  if (table !== 'reclamations' || !table_exists(db, table)) return new Map()
  const columns = db
    .query<{ name: string }, []>(`PRAGMA table_info(${quote_identifier(table)})`)
    .all()
    .map((column) => column.name)
  if (!columns.includes('id_reclamation')) return new Map()
  return new Map(
    db
      .query<JsonRow, []>(`SELECT * FROM ${quote_identifier(table)}`)
      .all()
      .flatMap((row) => {
        const id = row['id_reclamation']
        return typeof id === 'string' && id ? [[id, row] as const] : []
      })
  )
}

const to_sql_value = (column: string, value: unknown): string | number | null => {
  if (is_code_postal_column(column)) return normalize_code_postal(value)
  if (is_keep_as_text_column(column)) return stringify_identifier(value)
  if (value == null) return null
  return typeof value === 'number' ? value : String(value)
}

const emit_reclamation_changes = (
  db: Database,
  previous: ReadonlyMap<string, JsonRow>,
  rows: readonly JsonRow[]
): void => {
  if (previous.size === 0 || !table_exists(db, 'activites')) return
  const ignored = new Set(['id_reclamation', 'id_locataire', 'id_lot'])
  const now = new Date().toISOString()
  const insert = db.prepare(
    `INSERT INTO activites (
       date_creation, rattachement, auteur, id_client, id_locataire, id_lot,
       type, statut, mentions, contenu
     ) VALUES (?, ?, 'system:import.hlm', ?, ?, ?, 'ticket_change', 'logged', '[]', ?)`
  )

  for (const row of rows) {
    const id = row['id_reclamation']
    if (typeof id !== 'string' || !id) continue
    const before = previous.get(id)
    if (!before) continue
    for (const field of new Set([...Object.keys(before), ...Object.keys(row)])) {
      if (ignored.has(field) || Object.is(before[field], row[field])) continue
      insert.run(
        now,
        `tickets:${id}`,
        typeof row['id_client'] === 'string' ? row['id_client'] : null,
        typeof row['id_locataire'] === 'string' ? row['id_locataire'] : null,
        typeof row['id_lot'] === 'string' ? row['id_lot'] : null,
        JSON.stringify({ version: 1, champ: field, avant: before[field], apres: row[field] })
      )
    }
  }
}

/**
 * Atomically replaces a table with rows inferred from JSON objects.
 *
 * The requested table replacement itself is synchronous, preserving immediate
 * SQLite errors for existing consumers. Callers importing a `code_postal` column
 * must await the returned promise, which resolves only after the postal reference
 * has also been rebuilt.
 */
export const import_json_rows = (
  db: Database,
  table_name: string,
  rows: JsonRow[]
): Promise<void> => {
  if (rows.length === 0) return Promise.resolve()

  const all_keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const keys = all_keys.filter((key) => !key.startsWith('__empty'))
  if (keys.length === 0) return Promise.resolve()

  const table = normalize_knowledge_name(table_name)
  if (!table) throw new Error('Invalid table name')
  const quoted_table = quote_identifier(table)
  const staging = `${table}__import_${Bun.randomUUIDv7().replaceAll('-', '')}`
  const quoted_staging = quote_identifier(staging)
  const sanitized_keys = build_unique_sql_identifiers(keys)
  const quoted_keys = sanitized_keys.map(quote_identifier)
  const stored_rows = rows.map((row) =>
    Object.fromEntries(
      keys.map((key, index) => [
        sanitized_keys[index]!,
        to_sql_value(sanitized_keys[index]!, row[key])
      ])
    )
  )

  const col_types = sanitized_keys.map((key) => {
    if (is_keep_as_text_column(key)) return 'TEXT'
    const non_null = stored_rows.map((row) => row[key]).filter((value) => value != null)
    return non_null.length > 0 && non_null.every((value) => typeof value === 'number')
      ? 'INTEGER'
      : 'TEXT'
  })
  const col_defs = quoted_keys.map((key, index) => `${key} ${col_types[index]}`).join(', ')
  const placeholders = sanitized_keys.map(() => '?').join(', ')

  const replace_table = db.transaction(() => {
    const previous = existing_reclamations(db, table)
    db.run(`CREATE TABLE ${quoted_staging} (${col_defs})`)
    const insert = db.prepare(
      `INSERT INTO ${quoted_staging} (${quoted_keys.join(', ')}) VALUES (${placeholders})`
    )
    for (const row of stored_rows) {
      insert.run(...sanitized_keys.map((key) => row[key] ?? null))
    }
    db.run(`DROP TABLE IF EXISTS ${quoted_table}`)
    db.run(`ALTER TABLE ${quoted_staging} RENAME TO ${quoted_table}`)
    if (table === 'reclamations' && sanitized_keys.includes('id_reclamation')) {
      db.run('CREATE UNIQUE INDEX idx_reclamations_id_reclamation ON reclamations(id_reclamation)')
    }
    if (table_exists(db, 'contacts')) insert_contacts_from_rows(db, stored_rows)
    emit_reclamation_changes(db, previous, stored_rows)
  })
  replace_table.immediate()

  if (table !== COMMUNES_PAR_CODE_POSTAL_TABLE && sanitized_keys.includes('code_postal')) {
    return import_communes_par_code_postal_table(db).then(() => {})
  }
  return Promise.resolve()
}

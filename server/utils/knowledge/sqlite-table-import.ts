import { Database } from 'bun:sqlite'

import { normalize_knowledge_name } from './utils'

/** A single JSON object row eligible for tabular import. */
export type JsonRow = Record<string, unknown>

/**
 * Returns a non-empty, unique SQLite identifier for each input key.
 */
const build_unique_sql_identifiers = (keys: string[]): string[] => {
  const seen = new Map<string, number>()

  return keys.map((key) => {
    const base_identifier = normalize_knowledge_name(key) || 'column'
    const occurrence = seen.get(base_identifier) ?? 0
    seen.set(base_identifier, occurrence + 1)

    if (occurrence === 0) return base_identifier

    return `${base_identifier}_${occurrence + 1}`
  })
}

/**
 * Replaces a table with rows inferred from JSON objects (dynamic columns, full rebuild).
 */
export const import_json_rows = (db: Database, table_name: string, rows: JsonRow[]): void => {
  if (rows.length === 0) return

  const all_keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const keys = all_keys.filter((k) => !k.startsWith('__empty'))
  if (keys.length === 0) return

  const sanitized_keys = build_unique_sql_identifiers(keys)

  const col_types = keys.map((k) => {
    const non_null = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined)
    return non_null.length > 0 && non_null.every((v) => typeof v === 'number') ? 'INTEGER' : 'TEXT'
  })

  const col_defs = sanitized_keys.map((k, i) => `"${k}" ${col_types[i]}`).join(', ')

  db.run(`DROP TABLE IF EXISTS "${table_name}"`)
  db.run(`CREATE TABLE "${table_name}" (${col_defs})`)

  const placeholders = sanitized_keys.map(() => '?').join(', ')
  const stmt = db.prepare(
    `INSERT INTO "${table_name}" (${sanitized_keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`
  )

  db.transaction(() => {
    for (const row of rows) {
      const values = keys.map((k) => {
        const v = row[k]
        if (v === null || v === undefined) return null
        if (typeof v === 'number') return v
        return String(v)
      })
      stmt.run(...values)
    }
  })()
}

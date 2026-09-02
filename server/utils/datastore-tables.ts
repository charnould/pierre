import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'

import { datastorePaths } from './paths'

/**
 * Canonical HLM datastore tables backed by `datastore.sqlite`.
 *
 * Single source of truth for domain table names — importers and the desktop UI
 * consume this list. Add new tables here only.
 */
export const DATASTORE_TABLES = [
  'candidatures',
  'lots_locatifs',
  'comptes_locataires',
  'reclamations',
  'travaux'
] as const

/** HLM tables mirrored from knowledge JSON into `datastore.sqlite` on each build. */
export const DATASTORE_MIRROR_TABLES = [
  'reclamations',
  'comptes_locataires',
  'lots_locatifs'
] as const

type DatastoreTable = (typeof DATASTORE_TABLES)[number]

/** One canonical table and whether it is present in the current service datastore. */
export type DatastoreTableStatus = {
  name: DatastoreTable
  exists: boolean
}

/**
 * Presence report for every {@link DATASTORE_TABLES} entry.
 *
 * `tables` is sorted: present rows first, then absent; within each group, by `name`.
 */
export type DatastoreTablesResult = {
  tables: DatastoreTableStatus[]
}

/** Present tables before absent ones; tie-break alphabetically by `name`. */
const compare_table_status = (a: DatastoreTableStatus, b: DatastoreTableStatus): number =>
  a.exists === b.exists ? a.name.localeCompare(b.name) : a.exists ? -1 : 1

const to_result = (existing: ReadonlySet<DatastoreTable>): DatastoreTablesResult => ({
  tables: DATASTORE_TABLES.map((name) => ({ name, exists: existing.has(name) })).sort(
    compare_table_status
  )
})

/**
 * Reports which canonical tables exist in the service datastore.
 *
 * - Missing `datastore.sqlite` → every row has `exists: false` (no throw).
 * - SQLite errors after a successful open → propagates to the caller.
 */
export function get_datastore_tables(): DatastoreTablesResult {
  const path = datastorePaths().database
  if (!existsSync(path)) return to_result(new Set())
  const db = new Database(path, { readonly: true })

  try {
    const placeholders = DATASTORE_TABLES.map(() => '?').join(', ')
    const existing = new Set(
      db
        .query<{ name: string }, string[]>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`
        )
        .all(...DATASTORE_TABLES)
        .map((row) => row.name as DatastoreTable)
    )

    return to_result(existing)
  } finally {
    db.close()
  }
}

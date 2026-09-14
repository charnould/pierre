import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'

import { DATASTORE_TABLES, type DatastoreTable } from '../../shared/core-data'
import { datastorePaths } from './paths'

export {
  CORE_DATA_CONTRACT,
  coreDataContractForFilename,
  DATASTORE_TABLES,
  resemblesCoreDataFilename,
  type CoreDataContract,
  type DatastoreTable
} from '../../shared/core-data'

export type DatastoreTableStatus = {
  name: DatastoreTable
  exists: boolean
}

export type DatastoreTablesResult = {
  tables: DatastoreTableStatus[]
}

const compareTableStatus = (a: DatastoreTableStatus, b: DatastoreTableStatus): number =>
  a.exists === b.exists ? a.name.localeCompare(b.name) : a.exists ? -1 : 1

const toResult = (existing: ReadonlySet<DatastoreTable>): DatastoreTablesResult => ({
  tables: DATASTORE_TABLES.map((name) => ({ name, exists: existing.has(name) })).sort(
    compareTableStatus
  )
})

export function get_datastore_tables(): DatastoreTablesResult {
  const path = datastorePaths().database
  if (!existsSync(path)) return toResult(new Set())
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

    return toResult(existing)
  } finally {
    db.close()
  }
}

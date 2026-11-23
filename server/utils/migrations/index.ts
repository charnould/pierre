import { Database } from 'bun:sqlite'

import { openDatastore } from '../datastore-db'
import baselineSql from './000.sql' with { type: 'text' }

export type DatastoreMigration = {
  version: number
  name: string
  sql: string
}

export const APP_MIGRATIONS: readonly DatastoreMigration[] = [
  { version: 1, name: 'baseline', sql: baselineSql }
]

const SCHEMA_MIGRATIONS_SQL = `
  CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  ) STRICT
`

const MANUAL_REPAIR = 'Add a migration or delete the datastore file manually.'

export class DatastoreVersionError extends Error {
  constructor(current: number, supported: number) {
    super(`Datastore schema version ${current} is newer than supported version ${supported}`)
    this.name = 'DatastoreVersionError'
  }
}

const validate_migrations = (migrations: readonly DatastoreMigration[]): void => {
  for (const [index, migration] of migrations.entries()) {
    const expected = index + 1
    if (migration.version !== expected) {
      throw new Error(`Datastore migrations must be ordered and contiguous; expected ${expected}`)
    }
  }
}

const run_migration = (db: Database, migration: DatastoreMigration): void => {
  db.run('BEGIN IMMEDIATE')
  try {
    db.run(migration.sql)
    db.run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
      migration.version,
      migration.name
    ])
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}

const apply = (db: Database, migrations: readonly DatastoreMigration[]): number[] => {
  for (const migration of migrations) run_migration(db, migration)
  return migrations.map((migration) => migration.version)
}

const recreate_missing_tables = (db: Database, migrations: readonly DatastoreMigration[]): void => {
  const reference = new Database(':memory:')
  try {
    for (const migration of migrations) reference.run(migration.sql)
    const expected = reference
      .query<{ name: string; sql: string }, []>(
        `SELECT name, sql FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL`
      )
      .all()
    const existing = new Set(
      db
        .query<{ name: string }, []>(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        )
        .all()
        .map((row) => row.name)
    )
    const missing = expected.filter((table) => !existing.has(table.name))
    if (missing.length === 0) return
    const placeholders = missing.map(() => '?').join(', ')
    const dependents = reference
      .query<{ sql: string }, string[]>(
        `SELECT sql FROM sqlite_master
         WHERE type IN ('index', 'trigger')
           AND tbl_name IN (${placeholders})
           AND sql IS NOT NULL
         ORDER BY CASE type WHEN 'index' THEN 0 ELSE 1 END`
      )
      .all(...missing.map((table) => table.name))
    db.run('BEGIN IMMEDIATE')
    try {
      for (const table of missing) db.run(table.sql)
      for (const item of dependents) db.run(item.sql)
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  } finally {
    reference.close()
  }
}

const bootstrap = (path: string, migrations: readonly DatastoreMigration[]): number[] => {
  const db = openDatastore({ path, create: true })
  try {
    db.run('PRAGMA journal_mode = WAL')
    db.run(SCHEMA_MIGRATIONS_SQL)
    return apply(db, migrations)
  } finally {
    db.close()
  }
}

const open_existing = (path: string): Database => {
  try {
    return openDatastore({ path })
  } catch (error) {
    throw new Error(`Datastore is unreadable. ${MANUAL_REPAIR}`, { cause: error })
  }
}

const applied_version = (db: Database, migrations: readonly DatastoreMigration[]): number => {
  let applied: Array<{ version: number; name: string }>
  try {
    applied = db
      .query<{ version: number; name: string }, []>(
        'SELECT version, name FROM schema_migrations ORDER BY version'
      )
      .all()
  } catch (error) {
    throw new Error(`Datastore schema_migrations is missing or unreadable. ${MANUAL_REPAIR}`, {
      cause: error
    })
  }

  const current = applied.at(-1)?.version ?? 0
  if (current > migrations.length) throw new DatastoreVersionError(current, migrations.length)

  if (
    applied.length !== current ||
    !applied.every(
      (entry, index) => entry.version === index + 1 && entry.name === migrations[index]?.name
    )
  ) {
    throw new Error(`Datastore schema_migrations does not match APP_MIGRATIONS. ${MANUAL_REPAIR}`)
  }

  return current
}

export const migrate_datastore = async (
  path: string,
  migrations: readonly DatastoreMigration[] = APP_MIGRATIONS
): Promise<readonly number[]> => {
  validate_migrations(migrations)
  if (!(await Bun.file(path).exists())) return bootstrap(path, migrations)

  const db = open_existing(path)
  try {
    const current = applied_version(db, migrations)
    const applied = apply(db, migrations.slice(current))
    recreate_missing_tables(db, migrations)
    return applied
  } finally {
    db.close()
  }
}

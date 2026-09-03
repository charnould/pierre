import { Database } from 'bun:sqlite'
import { rm } from 'node:fs/promises'

import { DATASTORE_TABLES } from '../datastore-tables'
import baselineSql from './001-baseline.sql' with { type: 'text' }

export type DatastoreMigration = {
  version: number
  name: string
  sql: string
}

export const APP_MIGRATIONS: readonly DatastoreMigration[] = [
  { version: 1, name: 'baseline', sql: baselineSql }
]

const LEDGER_SQL = `
  CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`

type SchemaObject = {
  type: string
  name: string
  tbl_name: string
  sql: string | null
}

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

const has_ledger = (db: Database): boolean =>
  db
    .query<{ n: number }, []>(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name = 'schema_migrations'`
    )
    .get()!.n === 1

const ledger_has_canonical_schema = (db: Database): boolean => {
  const columns = db
    .query<{ name: string; type: string; notnull: number; pk: number }, []>(
      'PRAGMA table_info(schema_migrations)'
    )
    .all()
  return (
    columns.length === 3 &&
    columns[0]?.name === 'version' &&
    columns[0].type === 'INTEGER' &&
    columns[0].pk === 1 &&
    columns[1]?.name === 'name' &&
    columns[1].type === 'TEXT' &&
    columns[1].notnull === 1 &&
    columns[2]?.name === 'applied_at' &&
    columns[2].type === 'TEXT' &&
    columns[2].notnull === 1
  )
}

const applied_migrations = (db: Database): Array<{ version: number; name: string }> =>
  db
    .query<{ version: number; name: string }, []>(
      'SELECT version, name FROM schema_migrations ORDER BY version'
    )
    .all()

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

const build_expected_schema = (
  migrations: readonly DatastoreMigration[],
  version: number
): Map<string, SchemaObject> => {
  const db = new Database(':memory:')
  try {
    db.run(LEDGER_SQL)
    for (const migration of migrations.slice(0, version)) run_migration(db, migration)
    return new Map(
      db
        .query<SchemaObject, []>(
          `SELECT type, name, tbl_name, sql FROM sqlite_master
           WHERE sql IS NOT NULL
             AND name <> 'schema_migrations'
             AND name NOT LIKE 'sqlite_%'`
        )
        .all()
        .map((object) => [object.name, object])
    )
  } finally {
    db.close()
  }
}

const normalize_sql = (sql: string | null): string => sql?.replace(/\s+/g, ' ').trim() ?? ''

const app_schema_is_compatible = (
  db: Database,
  migrations: readonly DatastoreMigration[],
  version: number
): boolean => {
  const expected = build_expected_schema(migrations, version)
  const owned_objects = new Set(expected.keys())
  const actual = db
    .query<SchemaObject, []>(
      `SELECT type, name, tbl_name, sql FROM sqlite_master
       WHERE sql IS NOT NULL
         AND name <> 'schema_migrations'
         AND name NOT LIKE 'sqlite_%'`
    )
    .all()

  const external_tables = new Set<string>(DATASTORE_TABLES)
  if (
    actual.some(
      (object) =>
        !owned_objects.has(object.name) &&
        !external_tables.has(object.name) &&
        !external_tables.has(object.tbl_name)
    )
  ) {
    return false
  }

  const actual_owned = new Map(
    actual.filter((object) => owned_objects.has(object.name)).map((object) => [object.name, object])
  )
  if (actual_owned.size !== expected.size) return false

  for (const [name, expected_object] of expected) {
    const actual_object = actual_owned.get(name)
    if (
      actual_object?.type !== expected_object.type ||
      normalize_sql(actual_object.sql) !== normalize_sql(expected_object.sql)
    ) {
      return false
    }
  }
  return true
}

const remove_datastore = async (path: string): Promise<void> => {
  await Promise.all([path, `${path}-wal`, `${path}-shm`].map((file) => rm(file, { force: true })))
}

const bootstrap = (path: string, migrations: readonly DatastoreMigration[]): void => {
  const db = new Database(path, { create: true })
  try {
    db.run(LEDGER_SQL)
    for (const migration of migrations) run_migration(db, migration)
  } finally {
    db.close()
  }
}

export const migrate_datastore = async (
  path: string,
  migrations: readonly DatastoreMigration[] = APP_MIGRATIONS
): Promise<void> => {
  validate_migrations(migrations)
  if (!(await Bun.file(path).exists())) {
    bootstrap(path, migrations)
    return
  }

  let db: Database
  try {
    db = new Database(path)
  } catch {
    await remove_datastore(path)
    bootstrap(path, migrations)
    return
  }

  let reset = false
  let current = 0
  try {
    if (!has_ledger(db) || !ledger_has_canonical_schema(db)) {
      reset = true
    } else {
      const applied = applied_migrations(db)
      current = applied.at(-1)?.version ?? 0
      const supported = migrations.length
      if (current > supported) throw new DatastoreVersionError(current, supported)

      const ledger_is_valid = applied.every(
        (entry, index) => entry.version === index + 1 && entry.name === migrations[index]?.name
      )
      reset = !ledger_is_valid || !app_schema_is_compatible(db, migrations, current)
    }
  } catch (error) {
    if (error instanceof DatastoreVersionError) {
      db.close()
      throw error
    }
    reset = true
  }

  if (reset) {
    db.close()
    await remove_datastore(path)
    bootstrap(path, migrations)
    return
  }

  try {
    for (const migration of migrations.slice(current)) run_migration(db, migration)
  } finally {
    db.close()
  }
}

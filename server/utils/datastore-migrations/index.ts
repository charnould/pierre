import { Database } from 'bun:sqlite'

import { baseline } from './001-baseline'

export type DatastoreMigration = {
  version: number
  name: string
  objects: readonly string[]
  sql: string
}

export const APP_MIGRATIONS: readonly DatastoreMigration[] = [baseline]

const LEDGER_SQL = `
  CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`

const LEGACY_CORE_SCHEMA = {
  conversations: [
    ['conv_id', 'TEXT', 0, 0],
    ['config', 'TEXT', 0, 0],
    ['role', 'TEXT', 0, 0],
    ['timestamp', 'TEXT', 0, 0],
    ['content', 'TEXT', 0, 0],
    ['metadata', 'TEXT', 0, 0]
  ],
  users: [
    ['config', 'TEXT', 1, 0],
    ['email', 'TEXT', 1, 1],
    ['role', 'TEXT', 1, 0],
    ['password_hash', 'TEXT', 1, 0]
  ],
  telemetry: [
    ['id', 'INTEGER', 0, 1],
    ['timestamp', 'TEXT', 0, 0],
    ['host', 'TEXT', 0, 0],
    ['event', 'TEXT', 0, 0]
  ],
  knowledge_build: [
    ['id', 'INTEGER', 0, 1],
    ['created_at', 'TEXT', 0, 0],
    ['source', 'TEXT', 0, 0],
    ['kind', 'TEXT', 0, 0],
    ['code', 'TEXT', 0, 0],
    ['subject', 'TEXT', 0, 0]
  ],
  reclamation_drafts: [
    ['id_reclamation', 'TEXT', 1, 0],
    ['id_skill', 'TEXT', 1, 0],
    ['channel', 'TEXT', 0, 0],
    ['generated_output', 'TEXT', 0, 0],
    ['generated_reasoning', 'TEXT', 0, 0],
    ['generated_duration_ms', 'INTEGER', 0, 0],
    ['generated_at', 'TEXT', 1, 0],
    ['generated_by', 'TEXT', 1, 0],
    ['automation_id', 'TEXT', 0, 0],
    ['edited_output', 'TEXT', 0, 0],
    ['edited_at', 'TEXT', 0, 0],
    ['edited_by', 'TEXT', 0, 0],
    ['feedback_rating', 'INTEGER', 0, 0],
    ['feedback_comment', 'TEXT', 0, 0],
    ['feedback_at', 'TEXT', 0, 0],
    ['feedback_by', 'TEXT', 0, 0]
  ]
} as const

type SchemaObject = {
  type: string
  name: string
  sql: string | null
}

type SchemaColumn = {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

export class DatastoreVersionError extends Error {
  constructor(current: number, supported: number) {
    super(`Datastore schema version ${current} is newer than supported version ${supported}`)
    this.name = 'DatastoreVersionError'
  }
}

export class DatastoreSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatastoreSchemaError'
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

const has_table = (db: Database, name: string): boolean =>
  db
    .query<{ n: number }, [string]>(
      `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .get(name)!.n === 1

const table_columns = (db: Database, table: string): SchemaColumn[] =>
  db.query<SchemaColumn, []>(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all()

const has_ledger = (db: Database): boolean => has_table(db, 'schema_migrations')

const database_is_empty = (db: Database): boolean =>
  db
    .query<{ n: number }, []>(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .get()!.n === 0

const ledger_has_canonical_schema = (db: Database): boolean => {
  const columns = table_columns(db, 'schema_migrations')
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

const apply_migration = (db: Database, migration: DatastoreMigration): void => {
  db.run(migration.sql)
  db.run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
    migration.version,
    migration.name
  ])
}

const build_expected_schema = (
  migrations: readonly DatastoreMigration[],
  version: number
): { db: Database; objects: Map<string, SchemaObject> } => {
  const db = new Database(':memory:')
  db.run(LEDGER_SQL)
  for (const migration of migrations.slice(0, version)) apply_migration(db, migration)
  const objects = new Map(
    db
      .query<SchemaObject, []>(
        `SELECT type, name, sql FROM sqlite_master
         WHERE sql IS NOT NULL
           AND name <> 'schema_migrations'
           AND name NOT LIKE 'sqlite_%'`
      )
      .all()
      .map((object) => [object.name, object])
  )
  return { db, objects }
}

const normalize_sql = (sql: string | null): string =>
  sql
    ?.replace(/\bIF\s+NOT\s+EXISTS\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() ?? ''

const columns_are_compatible = (
  actual: readonly SchemaColumn[],
  expected: readonly SchemaColumn[]
): boolean =>
  expected.every((column) => {
    const found = actual.find((candidate) => candidate.name === column.name)
    return (
      found?.type === column.type &&
      found.notnull === column.notnull &&
      found.pk === column.pk &&
      found.dflt_value === column.dflt_value
    )
  })

const repair_missing_indexes = (
  db: Database,
  expected: ReadonlyMap<string, SchemaObject>
): void => {
  for (const object of expected.values()) {
    if (object.type !== 'index' || !object.sql) continue
    const present = db
      .query<{ n: number }, [string]>(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name = ?`
      )
      .get(object.name)!.n
    if (present === 0) db.run(object.sql)
  }
}

const assert_app_schema_compatible = (
  db: Database,
  migrations: readonly DatastoreMigration[],
  version: number
): void => {
  const expected_schema = build_expected_schema(migrations, version)
  try {
    repair_missing_indexes(db, expected_schema.objects)
    for (const expected of expected_schema.objects.values()) {
      const actual = db
        .query<SchemaObject, [string]>(
          `SELECT type, name, sql FROM sqlite_master WHERE name = ? AND sql IS NOT NULL`
        )
        .get(expected.name)
      if (!actual || actual.type !== expected.type) {
        throw new DatastoreSchemaError(`Missing or invalid datastore object: ${expected.name}`)
      }
      if (expected.type === 'table') {
        if (
          !columns_are_compatible(
            table_columns(db, expected.name),
            table_columns(expected_schema.db, expected.name)
          )
        ) {
          throw new DatastoreSchemaError(`Incompatible datastore table: ${expected.name}`)
        }
      } else if (normalize_sql(actual.sql) !== normalize_sql(expected.sql)) {
        throw new DatastoreSchemaError(`Incompatible datastore index: ${expected.name}`)
      }
    }
  } finally {
    expected_schema.db.close()
  }
}

const has_unique_index = (db: Database, table: string, columns: readonly string[]): boolean =>
  db
    .query<{ name: string; unique: number }, []>(`PRAGMA index_list("${table}")`)
    .all()
    .some((index) => {
      if (index.unique !== 1) return false
      const indexed_columns = db
        .query<{ name: string }, []>(`PRAGMA index_info("${index.name.replaceAll('"', '""')}")`)
        .all()
        .map((column) => column.name)
      return (
        indexed_columns.length === columns.length &&
        indexed_columns.every((column, position) => column === columns[position])
      )
    })

const is_recognized_legacy_database = (db: Database): boolean => {
  const core_is_valid = Object.entries(LEGACY_CORE_SCHEMA).every(([table, expected_columns]) => {
    if (!has_table(db, table)) return false
    const actual = table_columns(db, table)
    return (
      actual.length === expected_columns.length &&
      expected_columns.every(([name, type, notnull, pk]) => {
        const column = actual.find((candidate) => candidate.name === name)
        return column?.type === type && column.notnull === notnull && column.pk === pk
      })
    )
  })
  return (
    core_is_valid &&
    has_unique_index(db, 'conversations', ['conv_id', 'timestamp']) &&
    has_unique_index(db, 'reclamation_drafts', ['id_reclamation', 'id_skill'])
  )
}

const adopt_legacy_database = (db: Database): void => {
  if (!is_recognized_legacy_database(db)) {
    throw new DatastoreSchemaError(
      'Existing datastore has no migration ledger and does not match the supported legacy schema'
    )
  }

  const user_columns = new Set(table_columns(db, 'users').map((column) => column.name))
  if (!user_columns.has('preferences')) {
    db.run(`ALTER TABLE users ADD COLUMN preferences TEXT NOT NULL DEFAULT '{}'`)
  }
  if (!user_columns.has('avatar')) db.run('ALTER TABLE users ADD COLUMN avatar BLOB')
  db.run(LEDGER_SQL)
}

export const migrate_datastore = async (
  path: string,
  migrations: readonly DatastoreMigration[] = APP_MIGRATIONS
): Promise<void> => {
  validate_migrations(migrations)
  const db = new Database(path, { create: true })
  try {
    db.run('PRAGMA busy_timeout = 5000')
    db.run('BEGIN IMMEDIATE')
    try {
      if (database_is_empty(db)) {
        db.run(LEDGER_SQL)
      } else if (!has_ledger(db)) {
        adopt_legacy_database(db)
      } else if (!ledger_has_canonical_schema(db)) {
        throw new DatastoreSchemaError('Datastore migration ledger has an incompatible schema')
      }

      const applied = applied_migrations(db)
      const current = applied.at(-1)?.version ?? 0
      const supported = migrations.length
      if (current > supported) throw new DatastoreVersionError(current, supported)

      const ledger_is_valid = applied.every(
        (entry, index) => entry.version === index + 1 && entry.name === migrations[index]?.name
      )
      if (!ledger_is_valid) {
        throw new DatastoreSchemaError('Datastore migration ledger is inconsistent')
      }

      assert_app_schema_compatible(db, migrations, current)
      for (const migration of migrations.slice(current)) apply_migration(db, migration)
      assert_app_schema_compatible(db, migrations, migrations.length)
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  } finally {
    db.close()
  }
}

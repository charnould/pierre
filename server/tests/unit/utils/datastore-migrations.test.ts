import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  APP_MIGRATIONS,
  DatastoreSchemaError,
  DatastoreVersionError,
  migrate_datastore,
  type DatastoreMigration
} from '../../../utils/datastore-migrations'

const ROOT = 'datastores/_test_datastore_migrations'
const PATH = `${ROOT}/datastore.sqlite`

const open = (): Database => new Database(PATH)

const versions = (db: Database): number[] =>
  db
    .query<{ version: number }, []>('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((row) => row.version)

const future_migration: DatastoreMigration = {
  version: 2,
  name: 'future-example',
  objects: ['future_records'],
  sql: 'CREATE TABLE future_records (id TEXT PRIMARY KEY, value TEXT NOT NULL)'
}

const LEGACY_SCHEMA_SQL = `
  CREATE TABLE conversations (
    conv_id TEXT, config TEXT, role TEXT, timestamp TEXT, content TEXT, metadata TEXT,
    UNIQUE(conv_id, timestamp)
  );
  CREATE TABLE users (
    config TEXT NOT NULL,
    email TEXT PRIMARY KEY UNIQUE NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, host TEXT, event TEXT
  );
  CREATE TABLE knowledge_build (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT, source TEXT, kind TEXT, code TEXT, subject TEXT
  );
  CREATE TABLE reclamation_drafts (
    id_reclamation TEXT NOT NULL,
    id_skill TEXT NOT NULL,
    channel TEXT,
    generated_output TEXT,
    generated_reasoning TEXT,
    generated_duration_ms INTEGER,
    generated_at TEXT NOT NULL,
    generated_by TEXT NOT NULL,
    automation_id TEXT,
    edited_output TEXT,
    edited_at TEXT,
    edited_by TEXT,
    feedback_rating INTEGER,
    feedback_comment TEXT,
    feedback_at TEXT,
    feedback_by TEXT,
    UNIQUE(id_reclamation, id_skill)
  );
`

beforeEach(async () => {
  await mkdir(ROOT, { recursive: true })
})

afterEach(async () => {
  await rm(ROOT, { recursive: true, force: true })
})

describe('datastore migrations', () => {
  it('bootstraps a missing database with baseline tables, indexes, and ledger', async () => {
    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(versions(db)).toEqual([1])
      const objects = db
        .query<{ name: string }, []>(
          `SELECT name FROM sqlite_master
           WHERE name IN (
             'activites',
             'automations',
             'bulk_operations',
             'bulk_jobs',
             'contacts',
             'conversations',
             'knowledge_build',
             'telemetry',
             'users',
             'idx_activites_execution'
           )
           ORDER BY name`
        )
        .all()
        .map((row) => row.name)
      expect(objects).toEqual([
        'activites',
        'automations',
        'bulk_jobs',
        'bulk_operations',
        'contacts',
        'conversations',
        'idx_activites_execution',
        'knowledge_build',
        'telemetry',
        'users'
      ])
    } finally {
      db.close()
    }
  })

  it('refuses an unknown existing database without deleting its data', async () => {
    const legacy = open()
    legacy.run('CREATE TABLE legacy_data (value TEXT)')
    legacy.run("INSERT INTO legacy_data VALUES ('must be kept')")
    legacy.close()

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreSchemaError)

    const db = open()
    try {
      expect(db.query<{ value: string }, []>('SELECT value FROM legacy_data').get()?.value).toBe(
        'must be kept'
      )
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'schema_migrations'`
          )
          .get()?.n
      ).toBe(0)
    } finally {
      db.close()
    }
  })

  it('adopts the previous server schema without losing users or ticket drafts', async () => {
    const legacy = open()
    legacy.run(LEGACY_SCHEMA_SQL)
    legacy.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'kept@example.com', 'admin', 'hash')`
    )
    legacy.run(
      `INSERT INTO reclamation_drafts (id_reclamation, id_skill, generated_at, generated_by)
       VALUES ('REQ-1', 'ticket.answer-ticket', '2026-01-01', 'admin')`
    )
    legacy.close()

    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(versions(db)).toEqual([1])
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(
        db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM reclamation_drafts').get()?.n
      ).toBe(1)
      const user_columns = db
        .query<{ name: string }, []>('PRAGMA table_info(users)')
        .all()
        .map((column) => column.name)
      expect(user_columns).toContain('preferences')
      expect(user_columns).toContain('avatar')
    } finally {
      db.close()
    }
  })

  it('refuses a legacy lookalike with unexpected user columns', async () => {
    const legacy = open()
    legacy.run(LEGACY_SCHEMA_SQL)
    legacy.run('ALTER TABLE users ADD COLUMN arbitrary TEXT')
    legacy.close()

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreSchemaError)

    const db = open()
    try {
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'schema_migrations'`
          )
          .get()?.n
      ).toBe(0)
    } finally {
      db.close()
    }
  })

  it('does not adopt a legacy lookalike missing required constraints', async () => {
    const legacy = open()
    legacy.run(`
      CREATE TABLE conversations (
        conv_id TEXT, config TEXT, role TEXT, timestamp TEXT, content TEXT, metadata TEXT
      );
      CREATE TABLE users (
        config TEXT NOT NULL,
        email TEXT PRIMARY KEY UNIQUE NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL
      );
      CREATE TABLE telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, host TEXT, event TEXT
      );
      CREATE TABLE knowledge_build (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT, source TEXT, kind TEXT, code TEXT, subject TEXT
      );
    `)
    legacy.close()

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreSchemaError)

    const db = open()
    try {
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'schema_migrations'`
          )
          .get()?.n
      ).toBe(0)
    } finally {
      db.close()
    }
  })

  it('repairs a missing owned index without losing application data', async () => {
    await migrate_datastore(PATH)
    const damaged = open()
    damaged.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'lost@example.com', 'admin', 'hash')`
    )
    damaged.run('DROP INDEX idx_activites_execution')
    damaged.close()

    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master
             WHERE type = 'index' AND name = 'idx_activites_execution'`
          )
          .get()?.n
      ).toBe(1)
      expect(versions(db)).toEqual([1])
    } finally {
      db.close()
    }
  })

  it('fails closed when an owned table is incompatible', async () => {
    await migrate_datastore(PATH)
    const damaged = open()
    damaged.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'kept@example.com', 'admin', 'hash')`
    )
    damaged.run('DROP TABLE contacts')
    damaged.run('CREATE TABLE contacts (value TEXT PRIMARY KEY)')
    damaged.close()

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreSchemaError)

    const db = open()
    try {
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(versions(db)).toEqual([1])
    } finally {
      db.close()
    }
  })

  it('is idempotent and ignores HLM mirror tables outside application migrations', async () => {
    await migrate_datastore(PATH)
    const seeded = open()
    seeded.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'kept@example.com', 'admin', 'hash')`
    )
    seeded.run('CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT)')
    seeded.run("INSERT INTO reclamations VALUES ('REQ-1', 'LOC-1')")
    seeded.close()

    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM reclamations').get()?.n).toBe(1)
      expect(versions(db)).toEqual([1])
    } finally {
      db.close()
    }
  })

  it('applies ordered pending migrations to a lower-version database', async () => {
    await migrate_datastore(PATH)
    const seeded = open()
    seeded.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'kept@example.com', 'admin', 'hash')`
    )
    seeded.close()

    await migrate_datastore(PATH, [...APP_MIGRATIONS, future_migration])

    const db = open()
    try {
      expect(versions(db)).toEqual([1, 2])
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      db.run("INSERT INTO future_records VALUES ('future-1', 'ok')")
    } finally {
      db.close()
    }
  })

  it('rolls back both schema and ledger writes when a migration fails', async () => {
    await migrate_datastore(PATH)
    const failing: DatastoreMigration = {
      version: 2,
      name: 'failing-example',
      objects: ['half_created'],
      sql: `
        CREATE TABLE half_created (id TEXT PRIMARY KEY);
        INSERT INTO missing_table VALUES ('fail');
      `
    }

    await expect(migrate_datastore(PATH, [...APP_MIGRATIONS, failing])).rejects.toThrow()

    const db = open()
    try {
      expect(versions(db)).toEqual([1])
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'half_created'`
          )
          .get()?.n
      ).toBe(0)
    } finally {
      db.close()
    }
  })

  it('fails without resetting when the database version is ahead', async () => {
    await migrate_datastore(PATH, [...APP_MIGRATIONS, future_migration])
    const seeded = open()
    seeded.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'kept@example.com', 'admin', 'hash')`
    )
    seeded.close()

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreVersionError)

    const db = open()
    try {
      expect(versions(db)).toEqual([1, 2])
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'future_records'`
          )
          .get()?.n
      ).toBe(1)
    } finally {
      db.close()
    }
  })
})

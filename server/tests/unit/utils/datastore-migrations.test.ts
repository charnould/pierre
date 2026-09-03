import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'

import {
  APP_MIGRATIONS,
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
  sql: 'CREATE TABLE future_records (id TEXT PRIMARY KEY, value TEXT NOT NULL)'
}

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

  it('deletes and bootstraps an existing database without a ledger', async () => {
    const obsolete = open()
    obsolete.run('CREATE TABLE obsolete_data (value TEXT)')
    obsolete.run("INSERT INTO obsolete_data VALUES ('must be deleted')")
    obsolete.close()
    await writeFile(`${PATH}-wal`, 'stale')
    await writeFile(`${PATH}-shm`, 'stale')

    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(versions(db)).toEqual([1])
      expect(
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'obsolete_data'`
          )
          .get()?.n
      ).toBe(0)
    } finally {
      db.close()
    }
  })

  it('resets a ledger database whose application schema is incompatible', async () => {
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
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(0)
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

  it('resets unexpected application objects but preserves declared mirror tables', async () => {
    await migrate_datastore(PATH)
    const db = open()
    db.run('CREATE TABLE removed_feature (id TEXT)')
    db.run(
      `INSERT INTO users (config, email, role, password_hash)
       VALUES ('default', 'lost@example.com', 'admin', 'hash')`
    )
    db.close()

    await migrate_datastore(PATH)

    const reset = open()
    try {
      expect(reset.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(0)
      expect(
        reset
          .query<{ n: number }, []>(
            "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'removed_feature'"
          )
          .get()?.n
      ).toBe(0)
    } finally {
      reset.close()
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
    seeded.run('CREATE INDEX idx_reclamations_dynamic ON reclamations (id_reclamation)')
    seeded.run("INSERT INTO reclamations VALUES ('REQ-1', 'LOC-1')")
    seeded.close()

    await migrate_datastore(PATH)

    const db = open()
    try {
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
      expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM reclamations').get()?.n).toBe(1)
      expect(
        db
          .query<{ n: number }, []>(
            "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'idx_reclamations_dynamic'"
          )
          .get()?.n
      ).toBe(1)
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

import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

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
  it('bootstraps the squashed baseline and Better Auth tables', async () => {
    await migrate_datastore(PATH)

    using db = open()
    expect(versions(db)).toEqual([1])

    const objects = db
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master
         WHERE name IN (
           'account',
           'activites',
           'automations',
           'bulk_operations',
           'bulk_jobs',
           'contacts',
           'conversations',
           'knowledge_records',
           'session',
           'telemetry',
           'user_profiles',
           'users',
           'verification',
           'idx_activites_execution',
           'idx_activites_case_group',
           'idx_telemetry_recorded_at'
         )
         ORDER BY name`
      )
      .all()
      .map((row) => row.name)

    expect(objects).toEqual([
      'account',
      'activites',
      'automations',
      'bulk_jobs',
      'bulk_operations',
      'contacts',
      'conversations',
      'idx_activites_case_group',
      'idx_activites_execution',
      'idx_telemetry_recorded_at',
      'knowledge_records',
      'session',
      'telemetry',
      'user_profiles',
      'users',
      'verification'
    ])
    expect(
      ['account', 'session', 'users', 'verification'].every((name) => objects.includes(name))
    ).toBe(true)

    const userColumns = db
      .query<{ name: string }, []>('PRAGMA table_info(users)')
      .all()
      .map(({ name }) => name)
    expect(userColumns).toEqual([
      'id',
      'name',
      'email',
      'emailVerified',
      'image',
      'createdAt',
      'updatedAt',
      'role',
      'banned',
      'banReason',
      'banExpires',
      'module_ids',
      'chatbot_ids',
      'profile_id',
      'preferences',
      'avatar',
      'avatar_version'
    ])
  })

  it('fails without deleting an existing database that has no schema_migrations', async () => {
    const obsolete = open()
    obsolete.run('CREATE TABLE obsolete_data (value TEXT)')
    obsolete.run("INSERT INTO obsolete_data VALUES ('kept')")
    obsolete.close()

    await expect(migrate_datastore(PATH)).rejects.toThrow(/schema_migrations/)

    using db = open()
    expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM obsolete_data').get()?.n).toBe(1)
  })

  it('does not rebuild a hand-dropped application index', async () => {
    await migrate_datastore(PATH)
    const damaged = open()
    damaged.run('DROP INDEX idx_activites_execution')
    damaged.close()

    await migrate_datastore(PATH)

    using db = open()
    expect(
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM sqlite_master
           WHERE type = 'index' AND name = 'idx_activites_execution'`
        )
        .get()?.n
    ).toBe(0)
    expect(versions(db)).toEqual([1])
  })

  it('fails without rewriting a file that is not SQLite', async () => {
    await Bun.write(PATH, 'not a sqlite database')

    await expect(migrate_datastore(PATH)).rejects.toThrow()
    expect(await Bun.file(PATH).text()).toBe('not a sqlite database')
  })

  it('preserves Better Auth users and declared mirror tables when idempotent', async () => {
    await migrate_datastore(PATH)
    const seeded = open()
    seeded.run(
      `INSERT INTO users
         (id, name, email, emailVerified, createdAt, updatedAt, role)
       VALUES ('user-1', 'Kept', 'kept@example.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin')`
    )
    seeded.run('CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT)')
    seeded.run('CREATE INDEX idx_reclamations_dynamic ON reclamations (id_reclamation)')
    seeded.run("INSERT INTO reclamations VALUES ('REQ-1', 'LOC-1')")
    seeded.close()

    await migrate_datastore(PATH)

    using db = open()
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
  })

  it('applies ordered pending migrations to the baseline database', async () => {
    await migrate_datastore(PATH)
    await migrate_datastore(PATH, [...APP_MIGRATIONS, future_migration])

    using db = open()
    expect(versions(db)).toEqual([1, 2])
    db.run("INSERT INTO future_records VALUES ('future-1', 'ok')")
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

    using db = open()
    expect(versions(db)).toEqual([1])
    expect(
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'half_created'`
        )
        .get()?.n
    ).toBe(0)
  })

  it('fails without resetting when the database version is ahead', async () => {
    await migrate_datastore(PATH, [...APP_MIGRATIONS, future_migration])

    await expect(migrate_datastore(PATH)).rejects.toBeInstanceOf(DatastoreVersionError)

    using db = open()
    expect(versions(db)).toEqual([1, 2])
    expect(
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'future_records'`
        )
        .get()?.n
    ).toBe(1)
  })
})

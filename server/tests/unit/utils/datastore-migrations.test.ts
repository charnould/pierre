import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import {
  APP_MIGRATIONS,
  type DatastoreMigration,
  DatastoreVersionError,
  migrate_datastore
} from '../../../utils/datastore-migrations'

const ROOT = 'datastores/_test_datastore_migrations'
const PATH = `${ROOT}/datastore.sqlite`

const open = (): Database => new Database(PATH)

const versions = (db: Database): number[] =>
  db
    .query<{ version: number }, []>('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((row) => row.version)

const APP_VERSIONS = APP_MIGRATIONS.map((migration) => migration.version)

const future_migration: DatastoreMigration = {
  version: APP_MIGRATIONS.length + 1,
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
    expect(
      db
        .query<{ version: number; name: string }, []>(
          'SELECT version, name FROM schema_migrations ORDER BY version'
        )
        .all()
    ).toEqual([{ version: 1, name: 'baseline' }])
    expect(
      db
        .query<{ n: number }, []>("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'setup'")
        .get()?.n
    ).toBe(1)
    expect(
      db
        .query<{ n: number }, []>(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'carl_qualifications'"
        )
        .get()?.n
    ).toBe(1)

    const objects = db
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master
         WHERE name IN (
           'account',
           'activites',
           'automations',
           'bulk_operations',
           'bulk_jobs',
           'communication_dispatch_claims',
           'communication_provider_operations',
           'contacts',
           'conversations',
           'knowledge_records',
           'llm_runs',
           'session',
           'telemetry',
           'user_profiles',
           'users',
           'verification',
           'idx_activites_execution',
           'idx_activites_id_externe',
           'idx_activites_inbound_thread',
           'idx_activites_task_thread',
           'idx_automations_stuck',
           'idx_communication_provider_operations_reconcile',
           'idx_contacts_stale_sms'
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
      'communication_dispatch_claims',
      'communication_provider_operations',
      'contacts',
      'conversations',
      'idx_activites_execution',
      'idx_activites_id_externe',
      'idx_activites_inbound_thread',
      'idx_activites_task_thread',
      'idx_automations_stuck',
      'idx_communication_provider_operations_reconcile',
      'idx_contacts_stale_sms',
      'knowledge_records',
      'llm_runs',
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
    expect(
      db
        .query<{ name: string }, []>('PRAGMA table_info(conversations)')
        .all()
        .map(({ name }) => name)
    ).toEqual([
      'conv_id',
      'config_id',
      'user_email',
      'started_at',
      'updated_at',
      'messages',
      'review'
    ])
    expect(
      db
        .query<{ name: string }, []>('PRAGMA table_info(knowledge_records)')
        .all()
        .map(({ name }) => name)
    ).toContain('content')
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
    expect(
      db
        .query<{ name: string }, []>('PRAGMA table_info(activites)')
        .all()
        .map(({ name }) => name)
    ).toEqual([
      'id',
      'date_creation',
      'rattachement',
      'auteur',
      'destinataire',
      'id_client',
      'id_locataire',
      'id_lot',
      'type',
      'channel',
      'mentions',
      'contenu',
      'thread_id',
      'revision',
      'bulk_id',
      'execution_id',
      'idempotency_key',
      'id_externe'
    ])
    expect(
      db
        .query<{ sql: string }, []>(
          "SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'activites_no_update'"
        )
        .get()?.sql
    ).toContain('NEW.id_externe IS OLD.id_externe')
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
    expect(versions(db)).toEqual(APP_VERSIONS)
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
    expect(versions(db)).toEqual(APP_VERSIONS)
  })

  it('applies ordered pending migrations to the baseline database', async () => {
    await migrate_datastore(PATH)
    await migrate_datastore(PATH, [...APP_MIGRATIONS, future_migration])

    using db = open()
    expect(versions(db)).toEqual([...APP_VERSIONS, future_migration.version])
    db.run("INSERT INTO future_records VALUES ('future-1', 'ok')")
  })

  it('rolls back both schema and ledger writes when a migration fails', async () => {
    await migrate_datastore(PATH)
    const failing: DatastoreMigration = {
      version: APP_MIGRATIONS.length + 1,
      name: 'failing-example',
      sql: `
        CREATE TABLE half_created (id TEXT PRIMARY KEY);
        INSERT INTO missing_table VALUES ('fail');
      `
    }

    await expect(migrate_datastore(PATH, [...APP_MIGRATIONS, failing])).rejects.toThrow()

    using db = open()
    expect(versions(db)).toEqual(APP_VERSIONS)
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
    expect(versions(db)).toEqual([...APP_VERSIONS, future_migration.version])
    expect(
      db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'future_records'`
        )
        .get()?.n
    ).toBe(1)
  })

  it('recreates dropped application tables at the latest schema with indexes and triggers', async () => {
    const withColumn: DatastoreMigration = {
      version: APP_MIGRATIONS.length + 1,
      name: 'conversations-tag',
      sql: 'ALTER TABLE conversations ADD COLUMN tag TEXT'
    }
    const migrations = [...APP_MIGRATIONS, withColumn]
    await migrate_datastore(PATH, migrations)

    const seeded = open()
    seeded.run(
      `INSERT INTO users
         (id, name, email, emailVerified, createdAt, updatedAt, role)
       VALUES ('u-1', 'Kept', 'kept@example.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin')`
    )
    seeded.run('PRAGMA foreign_keys = OFF')
    seeded.run('DROP TABLE communication_dispatch_claims')
    seeded.run('DROP TABLE communication_provider_operations')
    seeded.run('DROP TABLE activites')
    seeded.run('DROP TABLE conversations')
    seeded.close()

    await migrate_datastore(PATH, migrations)

    using db = open()
    expect(db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM users').get()?.n).toBe(1)
    expect(
      db
        .query<{ name: string }, []>('PRAGMA table_info(conversations)')
        .all()
        .map((row) => row.name)
    ).toContain('tag')
    const recreated = db
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master
         WHERE name IN (
           'activites',
           'communication_dispatch_claims',
           'communication_provider_operations',
           'conversations',
           'idx_activites_execution',
           'idx_conversations_updated_at',
           'activites_no_update',
           'activites_no_delete'
         )
         ORDER BY name`
      )
      .all()
      .map((row) => row.name)
    expect(recreated).toEqual([
      'activites',
      'activites_no_delete',
      'activites_no_update',
      'communication_dispatch_claims',
      'communication_provider_operations',
      'conversations',
      'idx_activites_execution',
      'idx_conversations_updated_at'
    ])
  })
})

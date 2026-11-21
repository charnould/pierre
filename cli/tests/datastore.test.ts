import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { existsSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { backup } from '../src/commands/backup.ts'
import { reset } from '../src/commands/reset.ts'
import { restore } from '../src/commands/restore.ts'
import { configuredText, tempRoot, testContext, writeExe, writeServerBundle } from './support.ts'

function writeSqliteBackup(path: string, label: string, withMigrations = true) {
  const db = new Database(path)
  try {
    if (withMigrations) {
      db.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)')
      db.run("INSERT INTO schema_migrations VALUES (1, 'baseline')")
    }
    db.run('CREATE TABLE marker (value TEXT)')
    db.run('INSERT INTO marker VALUES (?)', [label])
  } finally {
    db.close()
  }
}

function readMarker(path: string): string | null {
  const db = new Database(path, { readonly: true })
  try {
    return db.query<{ value: string }, []>('SELECT value FROM marker').get()?.value ?? null
  } finally {
    db.close()
  }
}

function seedResetDatabase(path: string) {
  const db = new Database(path)
  try {
    db.run('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    db.run("INSERT INTO schema_migrations VALUES (1, 'baseline')")
    db.run('CREATE TABLE conversations (conv_id TEXT PRIMARY KEY)')
    db.run("INSERT INTO conversations VALUES ('c1')")
    db.run('CREATE TABLE setup (id TEXT PRIMARY KEY, content BLOB NOT NULL)')
    db.run("INSERT INTO setup VALUES ('providers', X'7631')")
    db.run('CREATE TABLE user_profiles (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO user_profiles VALUES ('p1')")
    db.run('CREATE TABLE users (id TEXT PRIMARY KEY, profile_id TEXT REFERENCES user_profiles(id))')
    db.run("INSERT INTO users VALUES ('u1', 'p1')")
    db.run('CREATE TABLE session (id TEXT PRIMARY KEY, userId TEXT REFERENCES users(id))')
    db.run("INSERT INTO session VALUES ('s1', 'u1')")
    db.run('CREATE TABLE account (id TEXT PRIMARY KEY, userId TEXT REFERENCES users(id))')
    db.run("INSERT INTO account VALUES ('a1', 'u1')")
    db.run('CREATE TABLE telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT)')
    db.run("INSERT INTO telemetry (event) VALUES ('boot')")
    db.run('CREATE TABLE activites (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT)')
    db.run(
      "CREATE TRIGGER activites_no_delete BEFORE DELETE ON activites BEGIN SELECT RAISE(ABORT, 'append-only'); END"
    )
    db.run("INSERT INTO activites (body) VALUES ('hello')")
    db.run(
      'CREATE TABLE communication_dispatch_claims (activity_id INTEGER PRIMARY KEY REFERENCES activites(id))'
    )
    db.run('INSERT INTO communication_dispatch_claims VALUES (1)')
    db.run(
      'CREATE TABLE communication_provider_operations (activity_id INTEGER PRIMARY KEY REFERENCES activites(id))'
    )
    db.run('INSERT INTO communication_provider_operations VALUES (1)')
    db.run('CREATE TABLE bulk_operations (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO bulk_operations VALUES ('b1')")
    db.run('CREATE TABLE bulk_jobs (id TEXT PRIMARY KEY, bulk_operation_id TEXT NOT NULL)')
    db.run("INSERT INTO bulk_jobs VALUES ('j1', 'b1')")
    db.run('CREATE TABLE intakes (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO intakes VALUES ('i1')")
    db.run('CREATE TABLE intake_attestations (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO intake_attestations VALUES ('s1')")
    db.run('CREATE TABLE knowledge_records (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO knowledge_records VALUES ('k1')")
    db.run('CREATE TABLE knowledge_source_docs (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO knowledge_source_docs VALUES ('d1')")
    db.run('CREATE TABLE reclamations (id TEXT PRIMARY KEY)')
    db.run("INSERT INTO reclamations VALUES ('r1')")
    db.run('CREATE TABLE communes_par_code_postal (code_postal TEXT PRIMARY KEY)')
    db.run("INSERT INTO communes_par_code_postal VALUES ('75001')")
  } finally {
    db.close()
  }
}

function listTables(path: string): string[] {
  const db = new Database(path, { readonly: true })
  try {
    return db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()
      .map((row) => row.name)
  } finally {
    db.close()
  }
}

function answers(values: string[]): () => Promise<string | null> {
  let index = 0
  return async () => values[index++] ?? null
}

describe('datastore backup, restore and reset', () => {
  it('explains how to copy and restore a backup with a remote TTY', async () => {
    const root = await tempRoot('pierre-backup-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(
      join(root, 'home', 'server', 'current', 'pierre'),
      "#!/bin/sh\nprintf '/var/lib/pierre/backups/datastore-20261121T100000Z.sqlite\\n'\n"
    )
    await writeFile(join(root, 'pierre.env'), configuredText({ HOST: 'gx.pierre-ia.org' }))
    const ctx = testContext(root, { tty: true })
    expect(await backup(ctx.ctx)).toBe(0)
    expect(ctx.out()).toContain('Sauvegarde')
    expect(ctx.out()).toContain(
      'scp root@gx.pierre-ia.org:/var/lib/pierre/backups/datastore-20261121T100000Z.sqlite .'
    )
    expect(ctx.out()).toContain(
      'scp datastore-20261121T100000Z.sqlite root@gx.pierre-ia.org:/tmp/ && ssh -t root@gx.pierre-ia.org pierre restore /tmp/datastore-20261121T100000Z.sqlite'
    )
  })

  it('refuses to restore without a terminal and ignores non-dated backup names', async () => {
    const root = await tempRoot('pierre-restore-tty-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    writeSqliteBackup(live, 'current')
    await mkdir(join(root, 'home', 'backups'), { recursive: true })
    writeSqliteBackup(join(root, 'home', 'backups', 'datastore.sqlite'), 'legacy')
    writeSqliteBackup(join(root, 'home', 'backups', 'datastore-20261121T100000Z-2.sqlite'), 'dup')
    const missing = testContext(root)
    expect(await restore(missing.ctx, [])).toBe(1)
    expect(missing.err()).toContain('Aucune sauvegarde.')

    writeSqliteBackup(join(root, 'home', 'backups', 'datastore-20261121T100000Z.sqlite'), 'saved')
    const nonTty = testContext(root)
    expect(await restore(nonTty.ctx, [])).toBe(1)
    expect(readMarker(live)).toBe('current')
    expect(nonTty.err()).toContain('Confirmation impossible')
  })

  it('validates the backup before stopping pierre', async () => {
    const root = await tempRoot('pierre-restore-invalid-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    writeSqliteBackup(live, 'current')
    const notSqlite = join(root, 'not-sqlite.sqlite')
    await writeFile(notSqlite, 'not a database')
    const noMigrations = join(root, 'no-migrations.sqlite')
    writeSqliteBackup(noMigrations, 'raw', false)

    const badFile = testContext(root, { canPrompt: true, readLine: async () => 'oui' })
    expect(await restore(badFile.ctx, [notSqlite])).toBe(1)
    expect(badFile.calls.some((call) => call.command === 'systemctl')).toBe(false)

    const missingTable = testContext(root, { canPrompt: true, readLine: async () => 'oui' })
    expect(await restore(missingTable.ctx, [noMigrations])).toBe(1)
    expect(missingTable.err()).toContain('schema_migrations')
    expect(missingTable.calls.some((call) => call.command === 'systemctl')).toBe(false)
    expect(readMarker(live)).toBe('current')
  })

  it('restores the latest dated backup in 0600 and cleans wal, knowledge and workspaces', async () => {
    const root = await tempRoot('pierre-restore-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    writeSqliteBackup(live, 'current')
    await writeFile(`${live}-wal`, 'wal')
    await mkdir(join(root, 'home', 'knowledge'), { recursive: true })
    await writeFile(join(root, 'home', 'knowledge', 'stale'), 'k')
    await mkdir(join(root, 'home', 'workspaces'), { recursive: true })
    await writeFile(join(root, 'home', 'workspaces', 'stale'), 'w')
    await mkdir(join(root, 'home', 'backups'), { recursive: true })
    writeSqliteBackup(join(root, 'home', 'backups', 'datastore-20261121T090000Z.sqlite'), 'older')
    const newest = join(root, 'home', 'backups', 'datastore-20261121T100000Z.sqlite')
    writeSqliteBackup(newest, 'newest')
    const ctx = testContext(root, { canPrompt: true, readLine: async () => 'oui' })
    expect(await restore(ctx.ctx, [])).toBe(0)
    expect(readMarker(live)).toBe('newest')
    expect(statSync(live).mode & 0o777).toBe(0o600)
    expect(existsSync(`${live}-wal`)).toBe(false)
    expect(existsSync(`${live}.before-restore`)).toBe(false)
    expect(existsSync(join(root, 'home', 'knowledge'))).toBe(false)
    expect(existsSync(join(root, 'home', 'workspaces'))).toBe(false)
    expect(ctx.out()).toContain('La base a été restaurée.')
    const commands = ctx.calls
      .filter((call) => call.command === 'systemctl')
      .map((call) => call.args[0])
    expect(commands).toEqual(['stop', 'start'])
  })

  it('rolls back to the previous database when pierre fails to come up after restore', async () => {
    const root = await tempRoot('pierre-restore-rollback-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    writeSqliteBackup(live, 'current')
    const backupFile = join(root, 'other.sqlite')
    writeSqliteBackup(backupFile, 'incompatible')

    const commands: string[] = []
    let starts = 0
    const ctx = testContext(root, {
      canPrompt: true,
      readLine: async () => 'oui',
      request: async () =>
        starts >= 2 ? { status: 200, body: 'ok', url: '' } : { status: 0, body: '', url: '' },
      start: (command, args) => {
        if (command === 'systemctl' && args[0]) {
          commands.push(args[0])
          if (args[0] === 'start') starts += 1
        }
        return {
          finished: Promise.resolve({
            code: 0,
            stdout: command === 'journalctl' ? 'Prestataires illisibles.\n' : '',
            stderr: ''
          }),
          kill: () => undefined
        }
      }
    })
    expect(await restore(ctx.ctx, [backupFile])).toBe(1)
    expect(readMarker(live)).toBe('current')
    expect(existsSync(`${live}.before-restore`)).toBe(false)
    expect(ctx.err()).toContain('Prestataires illisibles.')
    expect(ctx.err()).toContain('La base précédente a été remise en place.')
    expect(commands).toEqual(['stop', 'start', 'stop', 'start'])
  })

  it('refuses pierre reset outside a terminal and hides derived tables', async () => {
    const root = await tempRoot('pierre-reset-guard-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    seedResetDatabase(live)

    const nonTty = testContext(root)
    expect(await reset(nonTty.ctx, [])).toBe(1)
    expect(nonTty.err()).toContain('Confirmation impossible')
    expect(nonTty.calls.some((call) => call.command === 'systemctl')).toBe(false)

    const cancelled = testContext(root, { canPrompt: true, readLine: answers(['']) })
    expect(await reset(cancelled.ctx, [])).toBe(0)
    expect(cancelled.out()).toContain('activites')
    expect(cancelled.out()).toContain('bulk_operations')
    expect(cancelled.out()).toContain('intakes')
    expect(cancelled.out()).not.toContain('intake_attestations')
    expect(cancelled.out()).not.toContain('knowledge_source_docs')
    expect(cancelled.out()).not.toContain('reclamations')
    expect(cancelled.out()).not.toContain('communes_par_code_postal')
    expect(cancelled.out()).not.toContain('schema_migrations')
    expect(cancelled.calls.some((call) => call.command === 'systemctl')).toBe(false)
  })

  it('resets the entire database with tout', async () => {
    const root = await tempRoot('pierre-reset-all-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    seedResetDatabase(live)
    await writeFile(`${live}-wal`, 'wal')
    await mkdir(join(root, 'home', 'knowledge'), { recursive: true })
    await mkdir(join(root, 'home', 'workspaces'), { recursive: true })

    const ctx = testContext(root, { canPrompt: true, readLine: answers(['tout', 'oui']) })
    expect(await reset(ctx.ctx, [])).toBe(0)
    expect(existsSync(live)).toBe(false)
    expect(existsSync(`${live}-wal`)).toBe(false)
    expect(existsSync(join(root, 'home', 'knowledge'))).toBe(false)
    expect(existsSync(join(root, 'home', 'workspaces'))).toBe(false)
    expect(
      ctx.calls.filter((call) => call.command === 'systemctl').map((call) => call.args[0])
    ).toEqual(['stop', 'start'])
  })

  it('drops targeted tables with FK cascades, sqlite_sequence cleanup and folder cleanup', async () => {
    const root = await tempRoot('pierre-reset-targeted-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const live = join(root, 'home', 'datastore.sqlite')
    seedResetDatabase(live)
    await mkdir(join(root, 'home', 'knowledge'), { recursive: true })
    await mkdir(join(root, 'home', 'workspaces'), { recursive: true })

    // Simple table: conversations -> removes workspaces/
    const convCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['conversations', 'oui'])
    })
    expect(await reset(convCtx.ctx, [])).toBe(0)
    expect(listTables(live)).not.toContain('conversations')
    expect(listTables(live)).toContain('activites')
    expect(existsSync(join(root, 'home', 'workspaces'))).toBe(false)
    expect(existsSync(join(root, 'home', 'knowledge'))).toBe(true)

    // setup -> warns that providers are dropped too
    const setupCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['setup', 'oui'])
    })
    expect(await reset(setupCtx.ctx, [])).toBe(0)
    expect(setupCtx.out()).toContain('prestataires supprimés')
    expect(listTables(live)).not.toContain('setup')

    // activites -> drops dependent communication tables despite append-only trigger
    const actCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['activites', 'oui'])
    })
    expect(await reset(actCtx.ctx, [])).toBe(0)
    expect(actCtx.out()).toContain('communication_dispatch_claims')
    expect(actCtx.out()).toContain('communication_provider_operations')
    expect(listTables(live)).not.toContain('activites')
    expect(listTables(live)).not.toContain('communication_dispatch_claims')
    expect(listTables(live)).not.toContain('communication_provider_operations')
    const seqDb = new Database(live, { readonly: true })
    try {
      expect(
        seqDb
          .query<{ n: number }, []>(
            "SELECT COUNT(*) AS n FROM sqlite_sequence WHERE name = 'activites'"
          )
          .get()?.n
      ).toBe(0)
    } finally {
      seqDb.close()
    }

    // user_profiles without users -> detaches users.profile_id = NULL
    const profileCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['user_profiles', 'oui'])
    })
    expect(await reset(profileCtx.ctx, [])).toBe(0)
    expect(profileCtx.out()).toContain('users.profile_id = NULL')
    expect(listTables(live)).not.toContain('user_profiles')
    expect(listTables(live)).toContain('users')
    const userDb = new Database(live, { readonly: true })
    try {
      expect(
        userDb.query<{ profile_id: string | null }, []>('SELECT profile_id FROM users').get()
      ).toEqual({ profile_id: null })
    } finally {
      userDb.close()
    }

    // bulk_operations -> drops bulk_jobs too
    const bulkCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['bulk_operations', 'oui'])
    })
    expect(await reset(bulkCtx.ctx, [])).toBe(0)
    expect(bulkCtx.out()).toContain('bulk_jobs')
    expect(listTables(live)).not.toContain('bulk_operations')
    expect(listTables(live)).not.toContain('bulk_jobs')

    // intakes -> drops intake_* tables and knowledge/ while keeping knowledge_records
    const intakeCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['intakes', 'oui'])
    })
    expect(await reset(intakeCtx.ctx, [])).toBe(0)
    expect(intakeCtx.out()).toContain('intake_attestations')
    expect(listTables(live)).not.toContain('intakes')
    expect(listTables(live)).not.toContain('intake_attestations')
    expect(listTables(live)).toContain('knowledge_records')
    expect(listTables(live)).toContain('knowledge_source_docs')
    expect(existsSync(join(root, 'home', 'knowledge'))).toBe(false)

    await mkdir(join(root, 'home', 'knowledge'), { recursive: true })

    // knowledge_records -> drops knowledge_source_*, Core Data, postal reference and knowledge/
    const knowCtx = testContext(root, {
      canPrompt: true,
      readLine: answers(['knowledge_records', 'oui'])
    })
    expect(await reset(knowCtx.ctx, [])).toBe(0)
    expect(listTables(live)).not.toContain('knowledge_records')
    expect(listTables(live)).not.toContain('knowledge_source_docs')
    expect(listTables(live)).not.toContain('reclamations')
    expect(listTables(live)).not.toContain('communes_par_code_postal')
    expect(existsSync(join(root, 'home', 'knowledge'))).toBe(false)
  })
})

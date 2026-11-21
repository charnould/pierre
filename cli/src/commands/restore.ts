import { Database } from 'bun:sqlite'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync
} from 'node:fs'
import { join, resolve } from 'node:path'

import { isConfigured } from '../lib/config.ts'
import { publishFile } from '../lib/fs.ts'
import { printServiceFailure, waitForBody } from '../lib/server-service.ts'
import { type Context, must, runCommand } from '../lib/system.ts'
import { confirm, done, failed, say, spin } from '../lib/text.ts'

const DATED = /^datastore-\d{8}T\d{6}Z\.sqlite$/

function newestBackup(home: string): string | null {
  const directory = join(home, 'backups')
  if (!existsSync(directory)) return null
  const files = readdirSync(directory)
    .filter((name) => DATED.test(name))
    .sort()
  const latest = files.at(-1)
  return latest ? join(directory, latest) : null
}

function validateBackup(source: string): string | null {
  let db: Database
  try {
    db = new Database(source, { readonly: true })
  } catch {
    return 'Sauvegarde SQLite invalide ou illisible.'
  }
  try {
    const checks = db.query<{ quick_check: string }, []>('PRAGMA quick_check').all()
    if (checks.length !== 1 || checks[0]?.quick_check !== 'ok') {
      return 'Sauvegarde SQLite corrompue.'
    }
    const migrations = db
      .query<{ n: number }, []>(
        "SELECT 1 AS n FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'"
      )
      .get()
    if (!migrations) {
      return 'Sauvegarde incompatible : table schema_migrations absente.'
    }
    return null
  } catch {
    return 'Sauvegarde SQLite invalide ou illisible.'
  } finally {
    db.close()
  }
}

function checkpoint(live: string): void {
  if (!existsSync(live)) return
  try {
    const db = new Database(live)
    try {
      db.run('PRAGMA wal_checkpoint(TRUNCATE)')
    } finally {
      db.close()
    }
  } catch {
    // Allow restoring over a damaged live database.
  }
}

function rmWal(live: string): void {
  rmSync(`${live}-wal`, { force: true })
  rmSync(`${live}-shm`, { force: true })
}

async function rollbackDatabase(
  ctx: Context,
  live: string,
  before: string,
  hadLive: boolean,
  stopped: boolean
): Promise<boolean> {
  try {
    if (!stopped) await runCommand(ctx.runtime, 'systemctl', ['stop', 'pierre'])
    rmWal(live)
    if (hadLive && existsSync(before)) {
      renameSync(before, live)
    } else if (!hadLive) {
      rmSync(live, { force: true })
    }
    await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
    return waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120)
  } catch {
    return false
  }
}

export async function restore(ctx: Context, argv: string[]): Promise<number> {
  if (argv.length > 1) {
    failed(ctx, 'Usage : pierre restore [fichier]')
    return 2
  }
  const { bin, home } = ctx.runtime.paths
  if (!existsSync(bin) || !isConfigured(ctx.runtime)) {
    failed(ctx, 'Les services ne sont pas installés.')
    return 1
  }
  const requested = argv[0]
  const source = requested ? resolve(requested) : newestBackup(home)
  if (!source || !existsSync(source) || !statSync(source).isFile()) {
    failed(ctx, requested ? `Sauvegarde introuvable : ${requested}` : 'Aucune sauvegarde.')
    return 1
  }
  const live = join(home, 'datastore.sqlite')
  if (resolve(source) === resolve(live)) {
    failed(ctx, 'Ce fichier est la base en service.')
    return 1
  }
  const invalid = validateBackup(source)
  if (invalid) {
    failed(ctx, invalid)
    return 1
  }
  const answer = await confirm(ctx, `Remplacer la base par ${source} ?`)
  if (answer === 2) return 1
  if (answer !== 0) {
    say(ctx, 'Restauration annulée. Rien n’a été remplacé.')
    return 0
  }
  const before = `${live}.before-restore`
  const temporary = `${live}.restore`
  let stopped = false
  let swapped = false
  let hadLive = false
  try {
    await spin(ctx, 'Restauration', async () => {
      copyFileSync(source, temporary)
      chmodSync(temporary, 0o600)
      await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      stopped = true
      checkpoint(live)
      rmSync(before, { force: true })
      if (existsSync(live)) {
        renameSync(live, before)
        hadLive = true
      }
      swapped = true
      rmWal(live)
      publishFile(temporary, live)
      rmSync(join(home, 'knowledge'), { recursive: true, force: true })
      rmSync(join(home, 'workspaces'), { recursive: true, force: true })
      await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
      stopped = false
      if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
        throw new Error('Le serveur n’a pas répondu sur /up.')
      }
      rmSync(before, { force: true })
    })
  } catch (error) {
    rmSync(temporary, { force: true })
    await printServiceFailure(ctx, error)
    if (swapped) {
      const restored = await rollbackDatabase(ctx, live, before, hadLive, stopped)
      failed(
        ctx,
        restored
          ? 'La restauration a échoué. La base précédente a été remise en place.'
          : 'La restauration a échoué et la base précédente n’a pas pu être relancée.'
      )
    } else {
      if (stopped) await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
      failed(ctx, 'La restauration a échoué. La base en service est inchangée.')
    }
    return 1
  }
  done(ctx, 'La base a été restaurée.')
  return 0
}

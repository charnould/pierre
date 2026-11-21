import { Database } from 'bun:sqlite'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { DATASTORE_TABLES } from '../../../shared/core-data.ts'
import { isConfigured } from '../lib/config.ts'
import { printServiceFailure, waitForBody } from '../lib/server-service.ts'
import { type Context, must, runCommand } from '../lib/system.ts'
import { confirm, done, failed, say, sayError, spin } from '../lib/text.ts'

const CORE_DATA_SET = new Set<string>(DATASTORE_TABLES)

function isKnowledgeDerivedTable(name: string): boolean {
  return (
    name.startsWith('knowledge_source_') ||
    CORE_DATA_SET.has(name) ||
    name === 'communes_par_code_postal'
  )
}

function isIntakeDerivedTable(name: string): boolean {
  return name.startsWith('intake_')
}

type TableSummary = {
  all: string[]
  visible: Array<{ name: string; rows: number }>
}

type ResetPlan = {
  tables: string[]
  detachUserProfiles: boolean
  removeKnowledge: boolean
  removeWorkspaces: boolean
  recreatesAdmin: boolean
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

function inspectDatabase(live: string): TableSummary {
  const db = new Database(live, { readonly: true })
  try {
    const all = db
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name != 'schema_migrations'
           AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all()
      .map((row) => row.name)
    const visible = all
      .filter((name) => !isKnowledgeDerivedTable(name) && !isIntakeDerivedTable(name))
      .map((name) => ({
        name,
        rows:
          db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${quoteIdent(name)}`).get()?.n ?? 0
      }))
    return { all, visible }
  } finally {
    db.close()
  }
}

function buildPlan(requested: string[], allTables: string[]): ResetPlan {
  const existing = new Set(allTables)
  const selected = new Set(requested)
  const addIfPresent = (name: string) => {
    if (existing.has(name)) selected.add(name)
  }
  if (selected.has('users')) {
    addIfPresent('session')
    addIfPresent('account')
  }
  if (selected.has('activites')) {
    addIfPresent('communication_dispatch_claims')
    addIfPresent('communication_provider_operations')
  }
  if (selected.has('bulk_operations')) {
    addIfPresent('bulk_jobs')
  }
  const resetKnowledge = selected.has('knowledge_records')
  if (resetKnowledge) {
    for (const name of allTables) {
      if (isKnowledgeDerivedTable(name)) selected.add(name)
    }
  }
  const resetIntakes = selected.has('intakes')
  if (resetIntakes) {
    for (const name of allTables) {
      if (isIntakeDerivedTable(name)) selected.add(name)
    }
  }
  const removeKnowledge = resetKnowledge || resetIntakes
  const removeWorkspaces = selected.has('conversations')
  const recreatesAdmin = selected.has('users')
  const detachUserProfiles =
    selected.has('user_profiles') && !selected.has('users') && existing.has('users')
  return {
    tables: [...selected],
    detachUserProfiles,
    removeKnowledge,
    removeWorkspaces,
    recreatesAdmin
  }
}

function dropTables(live: string, plan: ResetPlan): void {
  const db = new Database(live)
  try {
    db.run('PRAGMA foreign_keys = OFF')
    db.run('BEGIN IMMEDIATE')
    try {
      if (plan.detachUserProfiles) {
        db.run('UPDATE users SET profile_id = NULL WHERE profile_id IS NOT NULL')
      }
      for (const table of plan.tables) {
        db.run(`DROP TABLE IF EXISTS ${quoteIdent(table)}`)
      }
      const hasSequence = db
        .query<{ n: number }, []>(
          "SELECT 1 AS n FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'"
        )
        .get()
      if (hasSequence) {
        for (const table of plan.tables) {
          db.run('DELETE FROM sqlite_sequence WHERE name = ?', [table])
        }
      }
      const violations = db.query('PRAGMA foreign_key_check').all()
      if (violations.length > 0) {
        throw new Error('Contrainte de clé étrangère rompue après suppression.')
      }
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
    db.run('PRAGMA foreign_keys = ON')
    db.run('VACUUM')
  } finally {
    db.close()
  }
}

async function runWithRestart(ctx: Context, action: () => void): Promise<boolean> {
  let stopped = false
  try {
    await spin(ctx, 'Réinitialisation', async () => {
      await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      stopped = true
      action()
      await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
      stopped = false
      if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
        throw new Error('Le serveur n’a pas répondu sur /up.')
      }
    })
    return true
  } catch (error) {
    if (stopped) await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
    await printServiceFailure(ctx, error)
    return false
  }
}

export async function reset(ctx: Context, argv: string[] = []): Promise<number> {
  if (argv.length > 0) {
    failed(ctx, 'Usage : pierre reset')
    return 2
  }
  const { bin, home } = ctx.runtime.paths
  if (!existsSync(bin) || !isConfigured(ctx.runtime)) {
    failed(ctx, 'Les services ne sont pas installés.')
    return 1
  }
  const live = join(home, 'datastore.sqlite')
  if (!existsSync(live)) {
    failed(ctx, 'Base introuvable.')
    return 1
  }
  if (!ctx.runtime.canPrompt) {
    sayError(ctx, "Confirmation impossible hors d'un terminal.")
    return 1
  }

  let summary: TableSummary
  try {
    summary = inspectDatabase(live)
  } catch {
    failed(ctx, 'Base illisible.')
    return 1
  }

  const width = Math.max(12, ...summary.visible.map((table) => table.name.length))
  const { dim, reset: clear } = ctx.runtime.palette
  for (const table of summary.visible) {
    const gap = ' '.repeat(width - table.name.length + 2)
    ctx.runtime.writeOut(`  ${table.name}${gap}${dim}${table.rows}${clear}\n`)
  }
  ctx.runtime.writeOut('\nTables à supprimer (séparées par des virgules, ou « tout ») : ')
  const raw = await ctx.runtime.readLine()
  if (raw === null) return 1
  const input = raw.trim()
  if (!input) {
    say(ctx, 'Réinitialisation annulée. Rien n’a été supprimé.')
    return 0
  }

  if (input.toLowerCase() === 'tout') {
    const answer = await confirm(ctx, 'Supprimer toute la base et les données applicatives ?')
    if (answer === 2) return 1
    if (answer !== 0) {
      say(ctx, 'Réinitialisation annulée. Rien n’a été supprimé.')
      return 0
    }
    const ok = await runWithRestart(ctx, () => {
      for (const name of [
        'datastore.sqlite',
        'datastore.sqlite-wal',
        'datastore.sqlite-shm',
        'knowledge',
        'workspaces'
      ]) {
        rmSync(join(home, name), { recursive: true, force: true })
      }
    })
    if (!ok) return 1
    done(ctx, 'La base a été réinitialisée.')
    return 0
  }

  const requested = [
    ...new Set(
      input
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  ]
  if (requested.length === 0) {
    say(ctx, 'Réinitialisation annulée. Rien n’a été supprimé.')
    return 0
  }
  const available = new Set(summary.visible.map((table) => table.name))
  const unknown = requested.filter((name) => !available.has(name))
  if (unknown.length > 0) {
    failed(ctx, `Table inconnue : ${unknown.join(', ')}`)
    return 1
  }

  const plan = buildPlan(requested, summary.all)
  const extras = plan.tables.filter((name) => !requested.includes(name))
  say(ctx, `Tables supprimées : ${plan.tables.join(', ')}`)
  if (extras.length > 0) {
    say(ctx, `Dépendances incluses : ${extras.join(', ')}`)
  }
  if (plan.detachUserProfiles) {
    say(ctx, 'Détachement : users.profile_id = NULL')
  }
  if (plan.recreatesAdmin) {
    say(ctx, 'Compte admin@pierre-ia.org recréé au redémarrage.')
  }
  if (plan.tables.includes('setup')) {
    say(ctx, 'Configuration applicative et prestataires supprimés.')
  }
  const dirs: string[] = []
  if (plan.removeKnowledge) dirs.push('knowledge/')
  if (plan.removeWorkspaces) dirs.push('workspaces/')
  if (dirs.length > 0) {
    say(ctx, `Dossiers supprimés : ${dirs.join(', ')}`)
  }

  const answer = await confirm(ctx, 'Confirmer la suppression ?')
  if (answer === 2) return 1
  if (answer !== 0) {
    say(ctx, 'Réinitialisation annulée. Rien n’a été supprimé.')
    return 0
  }

  const ok = await runWithRestart(ctx, () => {
    dropTables(live, plan)
    if (plan.removeKnowledge) rmSync(join(home, 'knowledge'), { recursive: true, force: true })
    if (plan.removeWorkspaces) rmSync(join(home, 'workspaces'), { recursive: true, force: true })
  })
  if (!ok) return 1
  done(ctx, 'Les tables ont été réinitialisées.')
  return 0
}

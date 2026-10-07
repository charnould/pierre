import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

import { acquireFileLock } from '../lib/file-lock.ts'
import {
  commandVersion,
  fetchReleases,
  selectServerRelease,
  versionGreater
} from '../lib/github.ts'
import {
  activateServerRelease,
  commitServerBundle,
  createServerStage,
  currentServerRelease,
  stageServerBundle
} from '../lib/server-bundle.ts'
import { writeServerUnit, writeUnit } from '../lib/server-service.ts'
import {
  activateSmolvm,
  prepareSmolvm,
  restoreSmolvm,
  type SmolvmState
} from '../lib/smolvm-runtime.ts'
import { CommandFailed, must, runCommand, waitForBody, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/tui.ts'

type UpdateState = {
  legacyUnit: string | null
  previous: string | null
  smolvmPrevious: SmolvmState
}

function marker(ctx: Context) {
  return join(ctx.runtime.paths.serverRoot, 'update.json')
}

async function withUpdateLock(ctx: Context, action: () => Promise<number>): Promise<number> {
  mkdirSync(ctx.runtime.paths.serverRoot, { recursive: true, mode: 0o700 })
  const release = acquireFileLock(join(ctx.runtime.paths.serverRoot, 'update.lock'))
  if (!release) {
    sayError(ctx, 'Une autre mise à jour de PIERRE est déjà en cours.')
    return 1
  }
  try {
    return await action()
  } finally {
    release()
  }
}

function parseSmolvmState(value: unknown): SmolvmState {
  if (!value || typeof value !== 'object' || !('kind' in value)) return { kind: 'absent' }
  const record = value as { kind?: unknown; target?: unknown }
  if (record.kind === 'versioned' && typeof record.target === 'string') {
    return { kind: 'versioned', target: record.target }
  }
  if (record.kind === 'legacy' && typeof record.target === 'string') {
    return { kind: 'legacy', target: record.target }
  }
  return { kind: 'absent' }
}

function writeMarker(ctx: Context, state: UpdateState) {
  const path = marker(ctx)
  const temporary = `${path}.new`
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 })
  const file = openSync(temporary, 'r')
  fsyncSync(file)
  closeSync(file)
  renameSync(temporary, path)
  const directory = openSync(ctx.runtime.paths.serverRoot, 'r')
  fsyncSync(directory)
  closeSync(directory)
}

function removeMarker(ctx: Context) {
  rmSync(marker(ctx), { force: true })
  const directory = openSync(ctx.runtime.paths.serverRoot, 'r')
  fsyncSync(directory)
  closeSync(directory)
}

async function waitForStableServer(ctx: Context) {
  if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) return false
  await ctx.runtime.sleep(10_000)
  const active = await runCommand(ctx.runtime, 'systemctl', ['is-active', 'pierre'])
  return (
    active.stdout.trim() === 'active' &&
    (await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 1))
  )
}

async function restoreRelease(ctx: Context, state: UpdateState) {
  await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
  restoreSmolvm(ctx, state.smolvmPrevious)
  if (state.previous) {
    activateServerRelease(ctx, state.previous)
    await writeServerUnit(ctx)
  } else {
    rmSync(ctx.runtime.paths.serverCurrent, { force: true })
    if (state.legacyUnit !== null) {
      await writeUnit(ctx, state.legacyUnit)
    }
  }
  if (state.previous || state.legacyUnit !== null) {
    await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
    if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
      throw new CommandFailed(1, 'La version restaurée ne répond pas.')
    }
  }
  removeMarker(ctx)
}

async function recoverInterruptedServerUpdate(ctx: Context): Promise<boolean> {
  if (!existsSync(marker(ctx))) return true
  say(ctx, 'Restauration de la mise à jour serveur interrompue…')
  try {
    const parsed = JSON.parse(readFileSync(marker(ctx), 'utf8')) as {
      legacyUnit?: unknown
      previous?: unknown
      smolvmPrevious?: unknown
    }
    const state: UpdateState = {
      legacyUnit: typeof parsed.legacyUnit === 'string' ? parsed.legacyUnit : null,
      previous: typeof parsed.previous === 'string' ? parsed.previous : null,
      smolvmPrevious: parseSmolvmState(parsed.smolvmPrevious)
    }
    await restoreRelease(ctx, state)
    return true
  } catch {
    sayError(ctx, 'La restauration automatique du bundle serveur a échoué.')
    return false
  }
}

async function installedVersion(ctx: Context): Promise<string> {
  if (existsSync(ctx.runtime.paths.bin)) return commandVersion(ctx, ctx.runtime.paths.bin)
  if (existsSync(ctx.runtime.paths.legacyBin)) {
    return commandVersion(ctx, ctx.runtime.paths.legacyBin)
  }
  return 'server-0.0.0'
}

export async function updateServer(ctx: Context): Promise<number> {
  return withUpdateLock(ctx, async () => {
    if (!existsSync(ctx.runtime.paths.envFile)) {
      sayError(ctx, "PIERRE n'est pas installé sur cette machine.")
      return 1
    }
    if (!(await recoverInterruptedServerUpdate(ctx))) return 1
    const current = await installedVersion(ctx)
    const forced = ctx.runtime.env['PIERRE_UPDATE_TAG']
    const latest = forced || selectServerRelease(await fetchReleases(ctx))?.tag || ''
    if (!latest) {
      sayError(ctx, 'Impossible de connaître la dernière version stable.')
      sayError(ctx, 'Vérifiez la connexion réseau, puis réessayez.')
      return 1
    }
    if (!versionGreater(latest, current)) {
      say(ctx, `${current} est déjà à jour.`)
      return 0
    }
    return installServerReleaseUnlocked(ctx, latest)
  })
}

export async function installServerRelease(ctx: Context, tag: string): Promise<number> {
  return withUpdateLock(ctx, () => installServerReleaseUnlocked(ctx, tag))
}

async function installServerReleaseUnlocked(ctx: Context, tag: string): Promise<number> {
  if (!(await recoverInterruptedServerUpdate(ctx))) return 1
  let preparedSmolvm: Awaited<ReturnType<typeof prepareSmolvm>>
  try {
    preparedSmolvm = await prepareSmolvm(ctx)
  } catch {
    sayError(ctx, 'La mise à jour du moteur microVM a échoué. Le serveur est inchangé.')
    return 1
  }
  const stage = createServerStage(ctx)
  let staged = stage
  const previous = currentServerRelease(ctx)
  const state: UpdateState = {
    legacyUnit:
      previous === null &&
      existsSync(ctx.runtime.paths.legacyBin) &&
      existsSync(ctx.runtime.paths.unitFile)
        ? readFileSync(ctx.runtime.paths.unitFile, 'utf8')
        : null,
    previous,
    smolvmPrevious: preparedSmolvm.previous
  }
  try {
    say(ctx, `Téléchargement de PIERRE ${tag}…`)
    try {
      await stageServerBundle(ctx, tag, stage)
    } catch {
      sayError(ctx, 'La release est incomplète ou invalide. Aucun fichier n’a été remplacé.')
      return 1
    }
    say(ctx, 'Serveur, bibliothèque et image microVM vérifiés.')
    const release = await commitServerBundle(ctx, tag, stage)
    staged = ''
    writeMarker(ctx, state)
    say(ctx, 'Activation du bundle serveur…')
    try {
      await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      activateSmolvm(ctx, preparedSmolvm.release)
      activateServerRelease(ctx, release)
      await writeServerUnit(ctx)
      const started = await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
      const healthy = started.code === 0 && (await waitForStableServer(ctx))
      if (!healthy) throw new CommandFailed(1, 'unhealthy')
    } catch {
      try {
        await restoreRelease(ctx, state)
        sayError(ctx, 'Le nouveau serveur n’a pas démarré. La version précédente a été restaurée.')
      } catch {
        sayError(ctx, 'Le rollback atomique du serveur a échoué.')
      }
      return 1
    }
    removeMarker(ctx)
    rmSync(ctx.runtime.paths.legacyBin, { force: true })
    rmSync(ctx.runtime.paths.legacySo, { force: true })
    say(ctx, `${tag} est installé et opérationnel.`)
    return 0
  } finally {
    if (staged) rmSync(staged, { recursive: true, force: true })
  }
}

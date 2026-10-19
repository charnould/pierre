import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Release } from '../../../shared/github-releases.ts'
import { ensureLatestCarl } from '../lib/carl.ts'
import { isConfigured } from '../lib/config.ts'
import { acquireFileLock } from '../lib/file-lock.ts'
import { fsyncPath } from '../lib/fs.ts'
import { commandVersion, releaseParts, versionGreater } from '../lib/github.ts'
import {
  activateServerRelease,
  currentServerRelease,
  findServerRelease,
  publishServerBundle,
  serverInstalled
} from '../lib/server-bundle.ts'
import { writeServerUnit } from '../lib/server-service.ts'
import {
  activateSmolvm,
  prepareSmolvm,
  restoreSmolvm,
  type PreparedSmolvm,
  type SmolvmState
} from '../lib/smolvm-runtime.ts'
import { CommandFailed, must, runCommand, waitForBody, type Context } from '../lib/system.ts'
import { done, failed, spin } from '../lib/text.ts'
import { restart } from './restart.ts'

type UpdateState = {
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
    failed(ctx, 'Une autre mise à jour est déjà en cours.')
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
  fsyncPath(temporary)
  renameSync(temporary, path)
  fsyncPath(ctx.runtime.paths.serverRoot)
}

function removeMarker(ctx: Context) {
  rmSync(marker(ctx), { force: true })
  fsyncPath(ctx.runtime.paths.serverRoot)
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
  if (isConfigured(ctx.runtime)) await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
  restoreSmolvm(ctx, state.smolvmPrevious)
  if (state.previous) {
    activateServerRelease(ctx, state.previous)
    await writeServerUnit(ctx)
  } else {
    rmSync(ctx.runtime.paths.serverCurrent, { force: true })
  }
  if (state.previous && isConfigured(ctx.runtime)) {
    await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
    if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
      throw new CommandFailed(1, 'La version restaurée ne répond pas.')
    }
  }
  removeMarker(ctx)
}

async function recoverInterruptedServerUpdate(ctx: Context): Promise<boolean> {
  if (!existsSync(marker(ctx))) return true
  try {
    await spin(ctx, 'Restauration', async () => {
      const parsed = JSON.parse(readFileSync(marker(ctx), 'utf8')) as {
        previous?: unknown
        smolvmPrevious?: unknown
      }
      const state: UpdateState = {
        previous: typeof parsed.previous === 'string' ? parsed.previous : null,
        smolvmPrevious: parseSmolvmState(parsed.smolvmPrevious)
      }
      await restoreRelease(ctx, state)
    })
    return true
  } catch {
    failed(ctx, 'La restauration automatique a échoué.')
    return false
  }
}

async function refreshCarl(
  ctx: Context
): Promise<'current' | 'installed' | 'unchanged' | 'unavailable' | 'failed'> {
  try {
    return await spin(ctx, 'Classement', () => ensureLatestCarl(ctx))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'L’installation de carl a échoué.'
    failed(ctx, message)
    return 'failed'
  }
}

async function installedVersion(ctx: Context): Promise<string> {
  if (!existsSync(ctx.runtime.paths.bin)) return ''
  return commandVersion(ctx, ctx.runtime.paths.bin)
}

async function finishCurrent(ctx: Context, current: string): Promise<number> {
  const carl = await refreshCarl(ctx)
  if (carl === 'failed') return 1
  if (carl === 'installed' && isConfigured(ctx.runtime)) return restart(ctx)
  if (carl === 'installed') {
    done(ctx, 'Le classement est installé.')
    return 0
  }
  done(ctx, `${current} est déjà à jour.`)
  return 0
}

export async function updateServer(ctx: Context): Promise<number> {
  return withUpdateLock(ctx, async () => {
    if (!serverInstalled(ctx) && !existsSync(marker(ctx))) {
      failed(ctx, 'Les services ne sont pas installés.')
      return 1
    }
    if (!(await recoverInterruptedServerUpdate(ctx))) return 1
    if (!serverInstalled(ctx)) {
      failed(ctx, 'Les services ne sont pas installés.')
      return 1
    }
    const current = await installedVersion(ctx)
    if (!releaseParts(current)) {
      failed(ctx, 'La version installée est illisible.')
      return 1
    }
    let release: Release | null
    try {
      release = await findServerRelease(ctx)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Impossible de connaître la dernière version stable.'
      failed(ctx, message)
      return 1
    }
    if (!release) {
      failed(ctx, 'Impossible de connaître la dernière version stable.')
      return 1
    }
    if (!versionGreater(release.tag, current)) return finishCurrent(ctx, current)
    return installServerRelease(ctx, release)
  })
}

async function installServerRelease(ctx: Context, release: Release): Promise<number> {
  if ((await refreshCarl(ctx)) === 'failed') return 1
  let prepared: PreparedSmolvm
  try {
    prepared = await prepareSmolvm(ctx)
  } catch {
    failed(ctx, 'La mise à jour du moteur a échoué. Le serveur est inchangé.')
    return 1
  }
  const state: UpdateState = {
    previous: currentServerRelease(ctx),
    smolvmPrevious: prepared.previous
  }
  const configured = isConfigured(ctx.runtime)
  let published = ''
  try {
    published = await spin(ctx, release.tag, () => publishServerBundle(ctx, release))
  } catch {
    failed(ctx, 'La release est incomplète ou invalide. Aucun fichier n’a été remplacé.')
    return 1
  }
  writeMarker(ctx, state)
  try {
    await spin(ctx, 'Activation', async () => {
      if (configured) await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      activateSmolvm(ctx, prepared.release)
      activateServerRelease(ctx, published)
      await writeServerUnit(ctx)
      if (!configured) return
      const started = await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
      if (started.code !== 0 || !(await waitForStableServer(ctx))) {
        throw new CommandFailed(1, 'unhealthy')
      }
    })
  } catch {
    try {
      await restoreRelease(ctx, state)
      failed(ctx, 'Le nouveau serveur n’a pas démarré. La version précédente a été restaurée.')
    } catch {
      failed(ctx, 'La restauration a échoué.')
    }
    return 1
  }
  removeMarker(ctx)
  done(
    ctx,
    configured ? `${release.tag} est installé et opérationnel.` : `${release.tag} est installé.`
  )
  return 0
}

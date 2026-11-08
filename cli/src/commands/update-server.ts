import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { type CarlInstall, ensureLatestCarl } from '../lib/carl.ts'
import { isConfigured } from '../lib/config.ts'
import { commandVersion, releaseParts, versionGreater } from '../lib/github.ts'
import {
  activateServerRelease,
  currentServerRelease,
  findServerRelease,
  publishServerBundle,
  serverInstalled
} from '../lib/server-bundle.ts'
import { waitForBody, writeServerUnit } from '../lib/server-service.ts'
import { ensureSmolvm } from '../lib/smolvm-runtime.ts'
import { CommandFailed, type Context, must, runCommand } from '../lib/system.ts'
import { confirm, done, failed, say, spin } from '../lib/text.ts'
import { restart } from './restart.ts'

async function refreshCarl(
  ctx: Context
): Promise<'current' | 'installed' | 'unchanged' | 'unavailable' | 'failed'> {
  try {
    const result = await spin(ctx, 'Carl', () => ensureLatestCarl(ctx), carlLabel)
    return result.status
  } catch (error) {
    const message = error instanceof Error ? error.message : 'L’installation de carl a échoué.'
    failed(ctx, message)
    return 'failed'
  }
}

function carlLabel(result: CarlInstall): string {
  if (!result.tag) return 'Carl'
  return result.status === 'current'
    ? `${result.tag} est déjà à jour.`
    : `${result.tag} est installé.`
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
    done(ctx, 'Carl est installé.')
    return 0
  }
  done(ctx, `${current} est déjà à jour.`)
  return 0
}

export async function updateServer(ctx: Context, reset = false): Promise<number> {
  if (!serverInstalled(ctx)) {
    failed(ctx, 'Les services ne sont pas installés.')
    return 1
  }
  const current = await installedVersion(ctx)
  if (!releaseParts(current)) {
    failed(ctx, 'La version installée est illisible.')
    return 1
  }
  let tag: string | null
  try {
    tag = await findServerRelease(ctx)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossible de connaître la dernière version stable.'
    failed(ctx, message)
    return 1
  }
  if (!tag) {
    failed(ctx, 'Impossible de connaître la dernière version stable.')
    return 1
  }
  if (reset) {
    const answer = await confirm(ctx, 'Continuer et supprimer toutes les données applicatives ?')
    if (answer === 2) return 1
    if (answer !== 0) {
      say(ctx, 'Remise à zéro annulée. Rien n’a été supprimé.')
      return 0
    }
  }
  if (!versionGreater(tag, current)) {
    return reset ? resetCurrentServer(ctx, current) : finishCurrent(ctx, current)
  }
  return installServerRelease(ctx, tag, reset)
}

async function installServerRelease(ctx: Context, tag: string, reset: boolean): Promise<number> {
  if ((await refreshCarl(ctx)) === 'failed') return 1
  try {
    await ensureSmolvm(ctx)
  } catch {
    failed(ctx, 'La mise à jour du moteur a échoué. Le serveur est inchangé.')
    return 1
  }
  const configured = isConfigured(ctx.runtime)
  const previous = currentServerRelease(ctx)
  if (!previous) {
    failed(ctx, 'La version installée est illisible.')
    return 1
  }
  let published = ''
  try {
    published = await spin(ctx, tag, () => publishServerBundle(ctx, tag))
  } catch {
    failed(ctx, 'La release est incomplète ou invalide. Aucun fichier n’a été remplacé.')
    return 1
  }
  let transitionStarted = false
  try {
    await spin(ctx, 'Activation', async () => {
      if (configured) await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      transitionStarted = true
      if (reset) resetDatastore(ctx)
      activateServerRelease(ctx, published)
      await writeServerUnit(ctx)
      if (!configured) return
      await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
      if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
        throw new CommandFailed(1, 'Le serveur n’a pas répondu sur /up.')
      }
    })
  } catch (error) {
    await printActivationFailure(ctx, error)
    if (!transitionStarted) {
      failed(ctx, 'La mise à jour du serveur a échoué. Le serveur installé est inchangé.')
      return 1
    }
    const restored = await restoreServerRelease(ctx, previous, configured)
    failed(
      ctx,
      restored
        ? 'La mise à jour du serveur a échoué. La version précédente a été restaurée.'
        : 'La mise à jour du serveur a échoué et la version précédente n’a pas pu être restaurée.'
    )
    return 1
  }
  done(ctx, configured ? `${tag} est installé et opérationnel.` : `${tag} est installé.`)
  return 0
}

async function resetCurrentServer(ctx: Context, current: string): Promise<number> {
  if ((await refreshCarl(ctx)) === 'failed') return 1
  const configured = isConfigured(ctx.runtime)
  try {
    await spin(ctx, 'Remise à zéro', async () => {
      if (configured) await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      resetDatastore(ctx)
      if (!configured) return
      await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
      if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
        throw new CommandFailed(1, 'Le serveur n’a pas répondu sur /up.')
      }
    })
  } catch (error) {
    await printActivationFailure(ctx, error)
    failed(ctx, 'La remise à zéro a échoué.')
    return 1
  }
  done(
    ctx,
    configured ? `${current} est remis à zéro et opérationnel.` : `${current} est remis à zéro.`
  )
  return 0
}

function resetDatastore(ctx: Context): void {
  const root = ctx.runtime.paths.home
  for (const name of [
    'datastore.sqlite',
    'datastore.sqlite-shm',
    'datastore.sqlite-wal',
    'files',
    'knowledge',
    'workspaces'
  ]) {
    rmSync(join(root, name), { recursive: true, force: true })
  }
}

async function printActivationFailure(ctx: Context, error: unknown): Promise<void> {
  const message =
    error instanceof CommandFailed ? error.output : error instanceof Error ? error.message : ''
  if (message) ctx.runtime.writeErr(message.endsWith('\n') ? message : `${message}\n`)
  const journal = await runCommand(ctx.runtime, 'journalctl', [
    '-u',
    'pierre',
    '-n',
    '30',
    '--no-pager'
  ])
  if (journal.stdout) ctx.runtime.writeErr(journal.stdout)
  if (journal.stderr) ctx.runtime.writeErr(journal.stderr)
}

async function restoreServerRelease(
  ctx: Context,
  previous: string,
  configured: boolean
): Promise<boolean> {
  try {
    if (currentServerRelease(ctx) !== previous) activateServerRelease(ctx, previous)
    await writeServerUnit(ctx)
    if (!configured) return true
    await must(ctx.runtime, 'systemctl', ['restart', 'pierre'])
    return waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120)
  } catch {
    return false
  }
}

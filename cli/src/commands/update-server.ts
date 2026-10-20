import { existsSync } from 'node:fs'

import { ensureLatestCarl, type CarlInstall } from '../lib/carl.ts'
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
import { CommandFailed, must, type Context } from '../lib/system.ts'
import { done, failed, spin } from '../lib/text.ts'
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

export async function updateServer(ctx: Context): Promise<number> {
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
  if (!versionGreater(tag, current)) return finishCurrent(ctx, current)
  return installServerRelease(ctx, tag)
}

async function installServerRelease(ctx: Context, tag: string): Promise<number> {
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
      activateServerRelease(ctx, published)
      await writeServerUnit(ctx)
      if (!configured) return
      await must(ctx.runtime, 'systemctl', ['start', 'pierre'])
      if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
        throw new CommandFailed(1, 'unhealthy')
      }
    })
  } catch {
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

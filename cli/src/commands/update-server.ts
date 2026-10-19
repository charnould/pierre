import { existsSync } from 'node:fs'

import { ensureLatestCarl } from '../lib/carl.ts'
import { isConfigured } from '../lib/config.ts'
import { commandVersion, releaseParts, versionGreater } from '../lib/github.ts'
import {
  activateServerRelease,
  findServerRelease,
  publishServerBundle,
  serverInstalled
} from '../lib/server-bundle.ts'
import { waitForBody, writeServerUnit } from '../lib/server-service.ts'
import { ensureSmolvm } from '../lib/smolvm-runtime.ts'
import { CommandFailed, must, runCommand, type Context } from '../lib/system.ts'
import { done, failed, spin } from '../lib/text.ts'
import { restart } from './restart.ts'

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
  let published = ''
  try {
    published = await spin(ctx, tag, () => publishServerBundle(ctx, tag))
  } catch {
    failed(ctx, 'La release est incomplète ou invalide. Aucun fichier n’a été remplacé.')
    return 1
  }
  try {
    await spin(ctx, 'Activation', async () => {
      if (configured) await must(ctx.runtime, 'systemctl', ['stop', 'pierre'])
      activateServerRelease(ctx, published)
      await writeServerUnit(ctx)
      if (!configured) return
      const started = await runCommand(ctx.runtime, 'systemctl', ['start', 'pierre'])
      if (
        started.code !== 0 ||
        !(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))
      ) {
        throw new CommandFailed(1, 'unhealthy')
      }
    })
  } catch {
    failed(ctx, 'Le serveur ne répond pas.')
    return 1
  }
  done(ctx, configured ? `${tag} est installé et opérationnel.` : `${tag} est installé.`)
  return 0
}

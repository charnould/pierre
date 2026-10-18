import { existsSync } from 'node:fs'

import {
  CONFIGURE_USAGE,
  formatEnv,
  isConfigured,
  isInstalled,
  mergeConfiguration,
  parseConfigureArgs,
  readEnvMap,
  writePrivate
} from '../lib/config.ts'
import { waitForBody, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/text.ts'
import { activateInstallation, finalizeConfiguration, rollbackInstallation } from './install.ts'

export async function configure(ctx: Context, argv: string[]): Promise<number> {
  if (!isInstalled(ctx.runtime)) {
    sayError(ctx, 'PIERRE n’est pas installé. Lancez d’abord pierre install.')
    return 1
  }
  const parsed = parseConfigureArgs(argv)
  if (!parsed.ok) {
    if (parsed.error) sayError(ctx, parsed.error)
    ctx.runtime.writeOut(`${CONFIGURE_USAGE}\n`)
    return argv[0] === '--help' || argv[0] === '-h' ? 0 : 2
  }
  const pending = existsSync(ctx.runtime.paths.pendingEnvFile)
  const current = readEnvMap(pending ? ctx.runtime.paths.pendingEnvFile : ctx.runtime.paths.envFile)
  const published = readEnvMap(ctx.runtime.paths.envFile)
  const first = !isConfigured(ctx.runtime) && !pending
  const merged = mergeConfiguration(current, parsed.flags, first)
  if (!merged.ok) {
    sayError(ctx, merged.error)
    ctx.runtime.writeOut(`${CONFIGURE_USAGE}\n`)
    return 2
  }
  writePrivate(ctx.runtime.paths.pendingEnvFile, formatEnv(merged.env))
  try {
    await activateInstallation(ctx, merged.env)
    if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) {
      throw new Error('local')
    }
    if (!(await waitForBody(ctx.runtime, `https://${merged.env.host}/up`, 120))) {
      throw new Error('public')
    }
  } catch {
    await rollbackInstallation(ctx)
    sayError(
      ctx,
      'La configuration n’a pas pu être activée. Les valeurs précédentes sont en place.'
    )
    say(ctx, 'La tentative est conservée. Relancez la même commande.')
    return 1
  }
  finalizeConfiguration(ctx)
  const { bold, cyan, green, reset } = ctx.runtime.palette
  say(ctx, `${green}✓${reset}  PIERRE répond sur ${cyan}https://${merged.env.host}${reset}`)
  if (!published.AUTH_PASSWORD) {
    say(ctx, '')
    say(ctx, `${bold}Compte : admin@pierre-ia.org${reset}`)
    say(ctx, `${bold}Mot de passe : ${merged.env.password}${reset}`)
    say(ctx, 'Notez-le maintenant. Il ne sera plus affiché.')
  }
  return 0
}

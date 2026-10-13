import { existsSync } from 'node:fs'

import { isConfigured, readEnvMap, readEnvValue } from '../lib/config.ts'
import { runCommand, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/text.ts'

export async function backup(ctx: Context): Promise<number> {
  const { bin, envFile, home } = ctx.runtime.paths
  if (!existsSync(bin) || !isConfigured(ctx.runtime)) {
    sayError(ctx, 'PIERRE n’est pas configuré sur cette machine.')
    return 1
  }
  const fileEnv = readEnvMap(envFile)
  const result = await runCommand(ctx.runtime, bin, ['backup'], {
    env: { ...ctx.runtime.env, ...fileEnv, PIERRE_HOME: home }
  })
  if (result.code !== 0) {
    if (result.stderr) ctx.runtime.writeErr(result.stderr)
    return result.code || 1
  }
  const path = result.stdout.trim()
  const host = readEnvValue(envFile, 'HOST') || 'serveur'
  const { cyan, dim, green, reset } = ctx.runtime.palette
  if (!ctx.runtime.tty) {
    ctx.runtime.writeOut(`${path}\n`)
    ctx.runtime.writeOut(`scp root@${host}:${path} .\n`)
    return 0
  }
  say(ctx, `${green}✓${reset}  La sauvegarde est terminée.`)
  say(ctx, '')
  say(ctx, `${dim}Fichier créé${reset}`)
  say(ctx, `${cyan}${path}${reset}`)
  say(ctx, '')
  say(ctx, 'Sur votre ordinateur :')
  say(ctx, `${cyan}scp root@${host}:${path} .${reset}`)
  say(ctx, '')
  say(ctx, `${dim}Si SSH n’écoute pas sur le port 22 : scp -P 2234 root@${host}:${path} .${reset}`)
  return 0
}

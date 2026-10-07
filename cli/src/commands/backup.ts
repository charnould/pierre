import { existsSync } from 'node:fs'

import { readEnvMap, readEnvValue } from '../lib/config.ts'
import { runCommand, type Context } from '../lib/system.ts'
import { say, sayError } from '../lib/tui.ts'

export async function backup(ctx: Context, interactive = false): Promise<number> {
  const { bin, envFile, home } = ctx.runtime.paths
  if (!existsSync(bin) || !existsSync(envFile)) {
    sayError(ctx, "PIERRE n'est pas installé sur cette machine.")
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
  if (interactive) {
    const { cyan, dim, green, reset } = ctx.runtime.palette
    say(ctx, `${green}✓${reset} La sauvegarde est terminée.`)
    ctx.runtime.writeOut('\n')
    say(ctx, `${dim}Fichier créé${reset}`)
    say(ctx, `${cyan}${path}${reset}`)
    ctx.runtime.writeOut('\n')
    say(ctx, 'Pour le télécharger sur votre ordinateur, ouvrez un terminal')
    say(ctx, 'sur votre ordinateur puis exécutez :')
    ctx.runtime.writeOut('\n')
    say(ctx, `${cyan}scp root@${host}:${path} .${reset}`)
    ctx.runtime.writeOut('\n')
    say(ctx, `${dim}Si votre serveur SSH n’utilise pas le port 22, ajoutez${reset}`)
    say(ctx, `${dim}-P PORT juste après scp. Exemple :${reset}`)
    say(ctx, `${dim}scp -P 2234 root@${host}:${path} .${reset}`)
    return 0
  }
  ctx.runtime.writeOut(`${path}\n\n`)
  ctx.runtime.writeOut(`scp root@${host}:${path} .\n`)
  ctx.runtime.writeOut("Si le SSH n'écoute pas sur le port 22, ajoutez -P PORT juste après scp.\n")
  return 0
}

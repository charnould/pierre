import { existsSync } from 'node:fs'
import { basename } from 'node:path'

import { isConfigured, readEnvMap, readEnvValue } from '../lib/config.ts'
import { type Context, runCommand } from '../lib/system.ts'
import { failed, spin } from '../lib/text.ts'

export async function backup(ctx: Context): Promise<number> {
  const { bin, envFile, home } = ctx.runtime.paths
  if (!existsSync(bin) || !isConfigured(ctx.runtime)) {
    failed(ctx, 'Les services ne sont pas installés.')
    return 1
  }
  const fileEnv = readEnvMap(envFile)
  const host = readEnvValue(envFile, 'HOST') || 'serveur'
  const run = async () => {
    const result = await runCommand(ctx.runtime, bin, ['backup'], {
      env: { ...ctx.runtime.env, ...fileEnv, PIERRE_HOME: home }
    })
    if (result.code !== 0) {
      if (result.stderr) ctx.runtime.writeErr(result.stderr)
      throw new Error('backup')
    }
    return result.stdout.trim()
  }
  let path = ''
  try {
    path = ctx.runtime.tty ? await spin(ctx, 'Sauvegarde', run) : await run()
  } catch {
    return 1
  }
  const name = basename(path)
  const pull = `scp root@${host}:${path} .`
  const push = `scp ${name} root@${host}:/tmp/ && ssh -t root@${host} pierre restore /tmp/${name}`
  if (!ctx.runtime.tty) {
    ctx.runtime.writeOut(`${path}\n`)
    ctx.runtime.writeOut(`${pull}\n`)
    ctx.runtime.writeOut(`${push}\n`)
    return 0
  }
  const { dim, reset } = ctx.runtime.palette
  ctx.runtime.writeOut(
    `\n  ${path}\n\n  ${pull}\n  ${push}\n\n  ${dim}Autre port : scp -P 2234 / ssh -p 2234${reset}\n`
  )
  return 0
}

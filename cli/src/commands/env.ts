import { existsSync } from 'node:fs'

import { ENV_KEYS, readEnvValue } from '../lib/config.ts'
import type { Context } from '../lib/system.ts'

export function printEnv(ctx: Context): number {
  if (!existsSync(ctx.runtime.paths.envFile)) {
    ctx.runtime.writeErr('PIERRE n’est pas configuré.\n')
    return 1
  }
  for (const key of ENV_KEYS) {
    ctx.runtime.writeOut(`${key}=${readEnvValue(ctx.runtime.paths.envFile, key)}\n`)
  }
  return 0
}

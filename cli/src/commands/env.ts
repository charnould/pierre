import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import {
  ENV_KEYS,
  formatEnv,
  mergeConfiguration,
  readEnvValue,
  writePrivate
} from '../lib/config.ts'
import type { Context } from '../lib/system.ts'

const SERVER_ENV = '/etc/pierre.env'

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

export function initEnv(ctx: Context): number {
  const file = ctx.runtime.paths.envFile
  if (file === SERVER_ENV) {
    ctx.runtime.writeErr('bun run env n’écrit pas /etc/pierre.env.\n')
    return 1
  }
  if (!existsSync(file)) {
    const merged = mergeConfiguration({}, { host: 'localhost' })
    if (!merged.ok) {
      ctx.runtime.writeErr(`${merged.error}\n`)
      return 1
    }
    mkdirSync(dirname(file), { recursive: true })
    writePrivate(file, formatEnv(merged.env))
  }
  return printEnv(ctx)
}

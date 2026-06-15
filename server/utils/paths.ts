import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const SERVER_ROOT = resolve(import.meta.dir, '..')

/** Monorepo local: customization/ is sibling of server/. Docker: under /app/customization/. */
export const CUSTOMIZATION_DIR = existsSync(join(SERVER_ROOT, 'customization'))
  ? join(SERVER_ROOT, 'customization')
  : join(resolve(SERVER_ROOT, '..'), 'customization')

export const CUSTOMIZATION_STATIC_ROOT = resolve(CUSTOMIZATION_DIR, '..')

/** Monorepo local: config/smolvm at repo root. Docker: under /app/config/smolvm/. */
export const SMOLVM_DIR = existsSync(join(SERVER_ROOT, 'config', 'smolvm'))
  ? join(SERVER_ROOT, 'config', 'smolvm')
  : join(resolve(SERVER_ROOT, '..'), 'config', 'smolvm')

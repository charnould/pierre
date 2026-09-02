import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const SERVER_ROOT = resolve(import.meta.dir, '..')
export const DATASTORES_ROOT = join(SERVER_ROOT, 'datastores')

export function resolveServiceName(raw: string | undefined): string {
  const service = raw === undefined ? 'default' : raw.trim()
  if (!service || service.includes('..') || !/^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/.test(service)) {
    throw new Error(`Invalid SERVICE name: ${JSON.stringify(raw)}`)
  }
  return service
}

export function datastorePaths(service = resolveServiceName(Bun.env['SERVICE'])) {
  const root = join(DATASTORES_ROOT, resolveServiceName(service))
  return {
    root,
    database: join(root, 'datastore.sqlite'),
    files: join(root, 'files'),
    knowledge: join(root, 'knowledge')
  } as const
}

/** Monorepo local: customization/ is sibling of server/. Docker: under /app/customization/. */
export const CUSTOMIZATION_DIR = existsSync(join(SERVER_ROOT, 'customization'))
  ? join(SERVER_ROOT, 'customization')
  : join(resolve(SERVER_ROOT, '..'), 'customization')

export const CUSTOMIZATION_STATIC_ROOT = resolve(CUSTOMIZATION_DIR, '..')

/** Monorepo local: config/smolvm at repo root. Docker: under /app/config/smolvm/. */
export const SMOLVM_DIR = existsSync(join(SERVER_ROOT, 'config', 'smolvm'))
  ? join(SERVER_ROOT, 'config', 'smolvm')
  : join(resolve(SERVER_ROOT, '..'), 'config', 'smolvm')

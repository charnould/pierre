import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

export const SERVER_ROOT = resolve(import.meta.dir, '..')
const DATASTORES_ROOT = join(SERVER_ROOT, 'datastores')

let datastoreRoot = DATASTORES_ROOT

export function setDatastoreRoot(root: string | null): void {
  datastoreRoot = root ?? DATASTORES_ROOT
}

export function testDatastoreRoot(label: string): string {
  return join(DATASTORES_ROOT, `.test-${label}`)
}

export function testDatastorePaths(label: string) {
  const root = testDatastoreRoot(label)
  return {
    root,
    database: join(root, 'datastore.sqlite'),
    files: join(root, 'files'),
    knowledge: join(root, 'knowledge')
  } as const
}

export function datastorePaths() {
  const root = datastoreRoot
  return {
    root,
    database: join(root, 'datastore.sqlite'),
    files: join(root, 'files'),
    knowledge: join(root, 'knowledge')
  } as const
}

export function resolvePathWithin(root: string, ...segments: string[]): string {
  const resolvedRoot = resolve(root)
  const candidate = resolve(resolvedRoot, ...segments)
  const relativePath = relative(resolvedRoot, candidate)
  if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
    return candidate
  }
  throw new Error('Resolved path escapes its root')
}

/** Monorepo local: config/smolvm at repo root. Docker: under /app/config/smolvm/. */
export const SMOLVM_DIR = existsSync(join(SERVER_ROOT, 'config', 'smolvm'))
  ? join(SERVER_ROOT, 'config', 'smolvm')
  : join(resolve(SERVER_ROOT, '..'), 'config', 'smolvm')

import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

// In the compiled executable every module shares the entry directory, and --asset
// lands next to it. In the repo, this file lives in server/utils.
const moduleDir = import.meta.dir
export const SERVER_ROOT = existsSync(join(moduleDir, 'assets/dist/.vite/manifest.json'))
  ? moduleDir
  : resolve(moduleDir, '..')

// Set by systemd on the VPS. Absent on the Mac, where everything stays in the repo.
const PIERRE_HOME = Bun.env['PIERRE_HOME'] || undefined
const DATASTORES_ROOT = PIERRE_HOME ?? join(SERVER_ROOT, 'datastores')

export const CARL_DIR = PIERRE_HOME
  ? join(PIERRE_HOME, 'models', 'carl')
  : join(SERVER_ROOT, 'models', 'carl')

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

export const SMOLVM_DIR = PIERRE_HOME
  ? join(PIERRE_HOME, 'smolvm')
  : existsSync(join(SERVER_ROOT, 'config', 'smolvm'))
    ? join(SERVER_ROOT, 'config', 'smolvm')
    : join(resolve(SERVER_ROOT, '..'), 'config', 'smolvm')

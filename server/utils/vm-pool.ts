import { existsSync } from 'node:fs'
import { arch as nodeArch } from 'node:os'
import { resolve } from 'node:path'

import { $ } from 'bun'

import { SMOLVM_DIR } from './paths'

const POOL_PREFIX = 'pierre-pool-'
const DEFAULT_POOL_SIZE = 4

const available = new Set<string>()
let nextIndex = 0
let refillPromise: Promise<void> | null = null

function poolSize(): number {
  const raw = Bun.env['SMOLVM_POOL_SIZE'] ?? String(DEFAULT_POOL_SIZE)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_POOL_SIZE
}

export function getSmolmachinePath(): string {
  const arch = nodeArch() === 'x64' ? 'amd64' : 'arm64'
  const smolmachinePath = resolve(SMOLVM_DIR, `pierre-${arch}.smolmachine`)
  if (!existsSync(smolmachinePath)) {
    throw new Error(
      `Smolmachine not found: ${smolmachinePath}. Run \`bun vm:build:osx\` or download artifacts to config/smolvm/.`
    )
  }
  return smolmachinePath
}

async function listPoolMachineNames(): Promise<string[]> {
  try {
    const raw = await $`smolvm machine ls --json`.json()
    const machines = Array.isArray(raw) ? raw : (raw?.machines ?? [])
    return machines
      .map((m: { name: string }) => m.name)
      .filter((name: string) => name.startsWith(POOL_PREFIX))
  } catch {
    return []
  }
}

async function deletePoolMachine(name: string): Promise<void> {
  console.log(`[VM_POOL] Removing stale pool VM: ${name}`)
  await $`smolvm machine stop --name ${name}`.nothrow().quiet()
  await $`smolvm machine delete --name ${name} -f`.nothrow().quiet()
}

async function poolMachineExists(name: string): Promise<boolean> {
  const names = await listPoolMachineNames()
  return names.includes(name)
}

async function waitForPoolMachine(name: string, timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await poolMachineExists(name)) return true
    await new Promise<void>((r) => setTimeout(r, 500))
  }
  return false
}

function isAlreadyExistsError(stderr: string): boolean {
  return stderr.includes('already exists') || stderr.includes('being created')
}

async function ensurePoolMachine(name: string): Promise<void> {
  if (await poolMachineExists(name)) {
    available.add(name)
    return
  }

  const result =
    await $`smolvm machine create --net --from ${getSmolmachinePath()} --name ${name}`.nothrow()
  if (result.exitCode === 0) {
    available.add(name)
    return
  }

  const stderr = result.stderr.toString()
  if (isAlreadyExistsError(stderr)) {
    if (await waitForPoolMachine(name)) {
      available.add(name)
      return
    }
    throw new Error(`Timed out waiting for pool VM ${name} to appear after: ${stderr.trim()}`)
  }

  throw new Error(stderr.trim() || `Failed to create pool VM ${name} (exit ${result.exitCode})`)
}

async function createPoolMachines(count: number): Promise<void> {
  if (count <= 0) return

  const startIndex = nextIndex
  const names = Array.from({ length: count }, (_, i) => `${POOL_PREFIX}${startIndex + i}`)
  nextIndex += count

  for (const name of names) {
    await ensurePoolMachine(name)
  }
}

/** Pre-creates smolVMs at server startup so conversations skip asset extraction. */
export async function initVmPool(): Promise<void> {
  const size = poolSize()
  if (size === 0) {
    console.log('[VM_POOL] Disabled')
    return
  }

  const stale = await listPoolMachineNames()
  for (const name of stale) {
    await deletePoolMachine(name)
  }

  console.log(`[VM_POOL] Pre-creating ${size} smolVM(s) (extraction happens once at startup)...`)
  const t0 = Date.now()
  await createPoolMachines(size)
  console.log(`[VM_POOL] ${available.size} VM(s) ready (${Date.now() - t0}ms)`)
}

export function takePoolVm(): string | undefined {
  const iter = available.values().next()
  if (iter.done) return undefined
  available.delete(iter.value)
  return iter.value
}

export function returnPoolVm(name: string): void {
  if (!name.startsWith(POOL_PREFIX)) return
  available.add(name)
  void refillPool()
}

async function refillPool(): Promise<void> {
  const deficit = poolSize() - available.size
  if (deficit <= 0) return
  if (refillPromise) return refillPromise

  refillPromise = (async () => {
    try {
      console.log(`[VM_POOL] Pool low — creating ${deficit} replacement VM(s) in background...`)
      await createPoolMachines(deficit)
      console.log(`[VM_POOL] ${available.size} VM(s) available`)
    } catch (err) {
      console.error('[VM_POOL] Failed to refill pool:', err)
    } finally {
      refillPromise = null
    }
  })()

  await refillPromise
}

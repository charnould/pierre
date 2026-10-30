import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { $ } from 'bun'

import { SMOLMACHINE_PATH } from './paths'

const POOL_PREFIX = 'pierre-pool-'
const DEFAULT_POOL_SIZE = 4
const DEFAULT_VM_CPUS = 1
const DEFAULT_VM_MEMORY_MIB = 512

const available = new Set<string>()
let nextIndex = 0
let refillPromise: Promise<void> | null = null
let slot: Promise<void> = Promise.resolve()

export function withVmCreationSlot<T>(create: () => Promise<T>): Promise<T> {
  const run = slot.then(create, create)
  slot = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

const positiveInteger = (name: string, fallback: number): number => {
  const raw = Bun.env[name] ?? String(fallback)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function poolSize(): number {
  const raw = Bun.env['SMOLVM_POOL_SIZE']
  if (raw === '0') return 0
  return positiveInteger('SMOLVM_POOL_SIZE', DEFAULT_POOL_SIZE)
}

export const vmResources = (): { cpus: number; memoryMiB: number } => ({
  cpus: positiveInteger('SMOLVM_CPUS', DEFAULT_VM_CPUS),
  memoryMiB: positiveInteger('SMOLVM_MEMORY_MIB', DEFAULT_VM_MEMORY_MIB)
})

export function getSmolmachinePath(): string {
  const smolmachinePath = resolve(SMOLMACHINE_PATH)
  if (!existsSync(smolmachinePath)) {
    throw new Error(
      `Smolmachine not found: ${smolmachinePath}. Run \`bun server:microvm:macos\` for local development.`
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
  await withVmCreationSlot(async () => {
    await $`smolvm machine stop --name ${name}`.nothrow().quiet()
    await $`smolvm machine delete --name ${name} -f`.nothrow().quiet()
  })
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
  const { cpus, memoryMiB } = vmResources()
  const result = await withVmCreationSlot(() =>
    $`smolvm machine create --net --from ${getSmolmachinePath()} --name ${name} --cpus ${cpus} --mem ${memoryMiB}`.nothrow()
  )
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

  await Promise.all(names.map(ensurePoolMachine))
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
  void refillPool()
  return iter.value
}

export function returnPoolVm(name: string): void {
  if (!name.startsWith(POOL_PREFIX)) return
  available.add(name)
  void refillPool()
}

async function refillPool(): Promise<void> {
  if (refillPromise) return refillPromise

  refillPromise = (async () => {
    try {
      while (available.size < poolSize()) {
        const deficit = poolSize() - available.size
        console.log(`[VM_POOL] Pool low — creating ${deficit} replacement VM(s) in background...`)
        await createPoolMachines(deficit)
      }
      console.log(`[VM_POOL] ${available.size} VM(s) available`)
    } catch (err) {
      console.error('[VM_POOL] Failed to refill pool:', err)
    } finally {
      refillPromise = null
    }
  })()

  await refillPromise
}

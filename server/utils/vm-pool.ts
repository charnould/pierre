import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  rmSync,
  statSync
} from 'node:fs'
import { resolve } from 'node:path'

import type { Subprocess } from 'bun'
import { $ } from 'bun'

import { datastorePaths, resolvePathWithin, SMOLVM_BIN } from './paths'
import { PiRpcClient } from './pi-rpc'
import { readAi } from './providers'
import {
  emptyDirectory,
  getSmolmachinePath,
  type HotPoolVm,
  providerFingerprint,
  smolvmBlockIoArgs,
  spawnPiProcess,
  vmResources,
  withVmCreationSlot
} from './smolvm'

export const POOL_PREFIX = 'pierre-pool-'
const DEFAULT_POOL_SIZE = 4
const POOL_FINGERPRINT_VERSION = 'hot-v1'
const HASH_CHUNK_BYTES = 1024 * 1024

type PoolMachineInfo = {
  name: string
  state: string
  labels: Record<string, string>
}

export type WarmPiResult = {
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'> | null
  piClient: PiRpcClient | null
  providerFingerprint: string | null
  thinkingLevel: string | null
}

export type VmPoolDependencies = {
  poolSize: () => number
  slotsRoot: () => string
  fingerprint: () => string
  listMachines: () => Promise<PoolMachineInfo[]>
  createMachine: (
    name: string,
    slotKnowledgePath: string,
    slotWorkPath: string,
    fp: string
  ) => Promise<void>
  startMachine: (name: string) => Promise<void>
  stopMachine: (name: string) => Promise<void>
  deleteMachine: (name: string) => Promise<void>
  warmPi: (name: string) => Promise<WarmPiResult>
  currentProviderFingerprint: () => string | null
  emptySlot: (slotKnowledgePath: string, slotWorkPath: string) => void
  removeSlotDir: (slotsRoot: string, name: string) => void
}

const fileHashCache = new Map<string, string>()

function sha256FileCached(filePath: string): string {
  const resolved = resolve(filePath)
  const stat = statSync(resolved)
  const cacheKey = `${resolved}:${stat.mtimeMs}:${stat.size}`
  const cached = fileHashCache.get(cacheKey)
  if (cached) return cached

  const hasher = new Bun.CryptoHasher('sha256')
  const buffer = new Uint8Array(HASH_CHUNK_BYTES)
  const fd = openSync(resolved, 'r')
  try {
    while (true) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null)
      if (bytesRead === 0) break
      hasher.update(bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead))
    }
  } finally {
    closeSync(fd)
  }

  const digest = hasher.digest('hex')
  fileHashCache.clear()
  fileHashCache.set(cacheKey, digest)
  return digest
}

function poolSlotsRoot(): string {
  return resolvePathWithin(datastorePaths().root, 'workspaces', '_pool')
}

export function computePoolFingerprint(
  smolmachinePath: string,
  resources: { cpus: number; memoryMiB: number },
  slotsRoot: string
): string {
  const imageHash = sha256FileCached(smolmachinePath)
  return new Bun.CryptoHasher('sha256')
    .update(
      `${POOL_FINGERPRINT_VERSION}|${imageHash}|${resources.cpus}|${resources.memoryMiB}|${process.platform}|${resolve(slotsRoot)}`
    )
    .digest('hex')
    .slice(0, 16)
}

function poolSize(): number {
  const raw = Bun.env['SMOLVM_POOL_SIZE']
  if (raw === '0') return 0
  const parsed = parseInt(raw ?? String(DEFAULT_POOL_SIZE), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_SIZE
}

function slotPaths(
  slotsRoot: string,
  name: string
): { slotDir: string; slotKnowledgePath: string; slotWorkPath: string } {
  const slotDir = resolvePathWithin(slotsRoot, name)
  return {
    slotDir,
    slotKnowledgePath: resolvePathWithin(slotDir, 'knowledge'),
    slotWorkPath: resolvePathWithin(slotDir, 'work')
  }
}

function parsePoolIndex(name: string): number {
  const suffix = Number(name.slice(POOL_PREFIX.length))
  return Number.isSafeInteger(suffix) && suffix >= 0 ? suffix : Number.MAX_SAFE_INTEGER
}

async function listPoolMachines(): Promise<PoolMachineInfo[]> {
  try {
    const raw = await $`${SMOLVM_BIN} machine ls --json`.json()
    const machines = Array.isArray(raw) ? raw : (raw?.machines ?? [])
    return machines
      .filter(
        (m: { name?: unknown }) => typeof m.name === 'string' && m.name.startsWith(POOL_PREFIX)
      )
      .map((m: { name: string; state?: unknown; labels?: unknown }) => ({
        name: m.name,
        state: typeof m.state === 'string' ? m.state : '',
        labels:
          m.labels && typeof m.labels === 'object' && !Array.isArray(m.labels)
            ? (m.labels as Record<string, string>)
            : {}
      }))
  } catch {
    return []
  }
}

async function defaultCreateMachine(
  name: string,
  slotKnowledgePath: string,
  slotWorkPath: string,
  fp: string
): Promise<void> {
  mkdirSync(slotKnowledgePath, { recursive: true })
  mkdirSync(slotWorkPath, { recursive: true })
  const { cpus, memoryMiB } = vmResources()
  const result = await withVmCreationSlot(
    () =>
      $`${SMOLVM_BIN} machine create --net --net-backend virtio-net ${smolvmBlockIoArgs()} --from ${getSmolmachinePath()} --name ${name} --cpus ${cpus} --mem ${memoryMiB} --label pierre-role=pool --label ${`pierre-pool-fp=${fp}`} -v ${slotKnowledgePath}:/knowledge:ro -v ${slotWorkPath}:/work`.nothrow(),
    'low'
  )
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.toString().trim() ||
        `Failed to create pool VM ${name} (exit ${result.exitCode})`
    )
  }
}

async function defaultStartMachine(name: string): Promise<void> {
  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine start --name ${name}`.quiet()
  }, 'low')
}

async function defaultStopMachine(name: string): Promise<void> {
  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine stop --name ${name}`.nothrow().quiet()
  }, 'low')
}

async function defaultDeleteMachine(name: string): Promise<void> {
  console.log(`[VM_POOL] Removing pool VM: ${name}`)
  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine stop --name ${name}`.nothrow().quiet()
    await $`${SMOLVM_BIN} machine delete --name ${name} -f`.nothrow().quiet()
  }, 'low')
}

async function defaultWarmPi(name: string): Promise<WarmPiResult> {
  const fp = providerFingerprint()
  if (fp === null) {
    return { piProcess: null, piClient: null, providerFingerprint: null, thinkingLevel: null }
  }
  const thinkingLevel = readAi().effort
  const piProcess = spawnPiProcess(name, false)
  const piClient = new PiRpcClient(piProcess)
  try {
    await piClient.waitForReady()
    return { piProcess, piClient, providerFingerprint: fp, thinkingLevel }
  } catch (error) {
    piClient.dispose()
    try {
      piProcess.kill()
    } catch {}
    throw error
  }
}

function defaultEmptySlot(slotKnowledgePath: string, slotWorkPath: string): void {
  emptyDirectory(slotKnowledgePath)
  emptyDirectory(slotWorkPath)
}

function defaultRemoveSlotDir(slotsRoot: string, name: string): void {
  try {
    rmSync(resolvePathWithin(slotsRoot, name), { recursive: true, force: true })
  } catch {}
}

const defaultVmPoolDependencies: VmPoolDependencies = {
  poolSize,
  slotsRoot: poolSlotsRoot,
  fingerprint: () => computePoolFingerprint(getSmolmachinePath(), vmResources(), poolSlotsRoot()),
  listMachines: listPoolMachines,
  createMachine: defaultCreateMachine,
  startMachine: defaultStartMachine,
  stopMachine: defaultStopMachine,
  deleteMachine: defaultDeleteMachine,
  warmPi: defaultWarmPi,
  currentProviderFingerprint: providerFingerprint,
  emptySlot: defaultEmptySlot,
  removeSlotDir: defaultRemoveSlotDir
}

function disposeWarmPi(warm: WarmPiResult): void {
  warm.piClient?.dispose()
  try {
    warm.piProcess?.kill()
  } catch {}
}

export function createVmPool(deps: VmPoolDependencies = defaultVmPoolDependencies) {
  const available = new Map<string, HotPoolVm>()
  const warming = new Set<string>()
  const checkedOut = new Set<string>()
  let refillPromise: Promise<void> | null = null

  function allocatePoolName(extraReserved?: ReadonlySet<string>): string {
    for (let i = 0; ; i++) {
      const candidate = `${POOL_PREFIX}${i}`
      if (
        !available.has(candidate) &&
        !warming.has(candidate) &&
        !checkedOut.has(candidate) &&
        !extraReserved?.has(candidate)
      ) {
        return candidate
      }
    }
  }

  function insertAvailable(
    name: string,
    slotKnowledgePath: string,
    slotWorkPath: string,
    warm: WarmPiResult
  ): void {
    const detachWatcher = warm.piClient
      ? warm.piClient.onClose(() => {
          const current = available.get(name)
          if (!current || current.piClient !== warm.piClient) return
          available.delete(name)
          console.warn(`[VM_POOL] Idle Pi exited unexpectedly for ${name} — recycling`)
          void recyclePoolVm(name)
        })
      : () => {}

    available.set(name, {
      name,
      slotKnowledgePath,
      slotWorkPath,
      piProcess: warm.piProcess,
      piClient: warm.piClient,
      providerFingerprint: warm.providerFingerprint,
      thinkingLevel: warm.thinkingLevel,
      detachWatcher
    })
  }

  async function warmExistingSlot(name: string, slotsRoot: string): Promise<boolean> {
    const { slotKnowledgePath, slotWorkPath } = slotPaths(slotsRoot, name)
    warming.add(name)
    try {
      await deps.startMachine(name)
      const warm = await deps.warmPi(name)
      insertAvailable(name, slotKnowledgePath, slotWorkPath, warm)
      return true
    } catch (error) {
      console.error(`[VM_POOL] Failed to warm existing pool VM ${name}:`, error)
      await deps.deleteMachine(name).catch(() => {})
      deps.removeSlotDir(slotsRoot, name)
      return false
    } finally {
      warming.delete(name)
    }
  }

  async function createAndWarmSlot(name: string, slotsRoot: string, fp: string): Promise<void> {
    const { slotKnowledgePath, slotWorkPath } = slotPaths(slotsRoot, name)
    warming.add(name)
    try {
      deps.emptySlot(slotKnowledgePath, slotWorkPath)
      await deps.createMachine(name, slotKnowledgePath, slotWorkPath, fp)
      await deps.startMachine(name)
      const warm = await deps.warmPi(name)
      if (available.size >= deps.poolSize()) {
        disposeWarmPi(warm)
        await deps.deleteMachine(name)
        deps.removeSlotDir(slotsRoot, name)
        return
      }
      insertAvailable(name, slotKnowledgePath, slotWorkPath, warm)
    } catch (error) {
      await deps.deleteMachine(name).catch(() => {})
      deps.removeSlotDir(slotsRoot, name)
      throw error
    } finally {
      warming.delete(name)
    }
  }

  async function refillPool(): Promise<void> {
    if (refillPromise) return refillPromise

    refillPromise = (async () => {
      try {
        while (available.size + warming.size < deps.poolSize()) {
          const name = allocatePoolName()
          const slotsRoot = deps.slotsRoot()
          const fp = deps.fingerprint()
          console.log(`[VM_POOL] Warming replacement VM ${name} in background...`)
          await createAndWarmSlot(name, slotsRoot, fp)
        }
        console.log(`[VM_POOL] ${available.size} hot VM(s) available`)
      } catch (error) {
        console.error('[VM_POOL] Failed to refill pool:', error)
      } finally {
        refillPromise = null
      }
    })()

    await refillPromise
  }

  /** Reuses matching persisted pool VMs and warms missing slots one by one in background priority. */
  async function initVmPool(): Promise<void> {
    const size = deps.poolSize()
    const slotsRoot = deps.slotsRoot()
    const existing = await deps.listMachines()

    if (size === 0) {
      for (const machine of existing) {
        await deps.deleteMachine(machine.name)
      }
      rmSync(slotsRoot, { recursive: true, force: true })
      console.log('[VM_POOL] Disabled')
      return
    }

    const fp = deps.fingerprint()
    const valid = existing
      .filter((m) => m.labels['pierre-role'] === 'pool' && m.labels['pierre-pool-fp'] === fp)
      .sort((a, b) => parsePoolIndex(a.name) - parsePoolIndex(b.name))
    const kept = valid.slice(0, size)
    const keptNames = new Set(kept.map((m) => m.name))
    const stale = existing.filter((m) => !keptNames.has(m.name))

    for (const machine of stale) {
      await deps.deleteMachine(machine.name)
      deps.removeSlotDir(slotsRoot, machine.name)
    }

    if (existsSync(slotsRoot)) {
      for (const entry of readdirSync(slotsRoot)) {
        if (!keptNames.has(entry)) deps.removeSlotDir(slotsRoot, entry)
      }
    }

    const t0 = Date.now()
    console.log(
      `[VM_POOL] Initializing ${size} hot VM(s) (${kept.length} persisted, ${Math.max(0, size - kept.length)} to create)...`
    )

    for (const machine of kept) {
      if (machine.state === 'running') {
        await deps.stopMachine(machine.name)
      }
      const { slotKnowledgePath, slotWorkPath } = slotPaths(slotsRoot, machine.name)
      deps.emptySlot(slotKnowledgePath, slotWorkPath)
    }

    for (const machine of kept) {
      await warmExistingSlot(machine.name, slotsRoot)
    }

    while (available.size + warming.size < size) {
      const name = allocatePoolName(keptNames)
      await createAndWarmSlot(name, slotsRoot, fp)
    }

    console.log(`[VM_POOL] ${available.size} hot VM(s) ready (${Date.now() - t0}ms)`)
  }

  /** Pops a pre-booted hot pool VM in memory (0 ms) and schedules background refill. */
  function takePoolVm(): HotPoolVm | undefined {
    const iter = available.entries().next()
    if (iter.done) return undefined
    const [name, slot] = iter.value
    available.delete(name)
    checkedOut.add(name)
    slot.detachWatcher()
    queueMicrotask(() => {
      void refillPool()
    })
    return slot
  }

  /**
   * Stops a finished pool VM, wipes its slot directories, and either deletes it when the pool
   * is already at capacity or restarts and re-warms it for reuse.
   */
  async function recyclePoolVm(name: string): Promise<void> {
    checkedOut.delete(name)
    if (!name.startsWith(POOL_PREFIX)) return
    if (warming.has(name)) return

    warming.add(name)
    const slotsRoot = deps.slotsRoot()
    const { slotKnowledgePath, slotWorkPath } = slotPaths(slotsRoot, name)
    let failed = false
    try {
      await deps.stopMachine(name)
      deps.emptySlot(slotKnowledgePath, slotWorkPath)

      if (available.size + warming.size > deps.poolSize()) {
        await deps.deleteMachine(name)
        deps.removeSlotDir(slotsRoot, name)
        return
      }

      await deps.startMachine(name)
      const warm = await deps.warmPi(name)
      if (available.size >= deps.poolSize()) {
        disposeWarmPi(warm)
        await deps.deleteMachine(name)
        deps.removeSlotDir(slotsRoot, name)
        return
      }
      insertAvailable(name, slotKnowledgePath, slotWorkPath, warm)
    } catch (error) {
      failed = true
      console.error(`[VM_POOL] Failed to recycle pool VM ${name}:`, error)
      await deps.deleteMachine(name).catch(() => {})
      deps.removeSlotDir(slotsRoot, name)
    } finally {
      warming.delete(name)
    }

    if (failed) {
      queueMicrotask(() => {
        void refillPool()
      })
    }
  }

  /** Restarts idle Pi processes inside already-running pool VMs when provider config changes. */
  async function refreshPoolProviders(): Promise<void> {
    const targetFp = deps.currentProviderFingerprint()
    const staleSlots = [...available.entries()].filter(
      ([, slot]) => slot.providerFingerprint !== targetFp
    )
    for (const [name, slot] of staleSlots) {
      if (available.get(name) !== slot) continue
      available.delete(name)
      warming.add(name)
      slot.detachWatcher()
      slot.piClient?.dispose()
      try {
        slot.piProcess?.kill()
      } catch {}

      let shouldRecycle = false
      try {
        const warm = await deps.warmPi(name)
        insertAvailable(name, slot.slotKnowledgePath, slot.slotWorkPath, warm)
      } catch (error) {
        shouldRecycle = true
        console.error(`[VM_POOL] Failed to refresh Pi on pool VM ${name}:`, error)
      } finally {
        warming.delete(name)
      }

      if (shouldRecycle) {
        void recyclePoolVm(name)
      }
    }
  }

  return {
    initVmPool,
    takePoolVm,
    recyclePoolVm,
    refreshPoolProviders,
    availableCount: () => available.size,
    warmingCount: () => warming.size
  }
}

const defaultPool = createVmPool()

export const initVmPool = defaultPool.initVmPool
export const takePoolVm = defaultPool.takePoolVm
export const recyclePoolVm = defaultPool.recyclePoolVm
export const refreshPoolProviders = defaultPool.refreshPoolProviders

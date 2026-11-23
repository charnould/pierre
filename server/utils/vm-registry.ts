import { existsSync, readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { $ } from 'bun'

import { promptById } from '../../shared/prompts'
import { cleanupConversationWorkspace } from './ai-attachments'
import { datastorePaths, resolvePathWithin, SMOLVM_BIN } from './paths'
import { PiRpcClient } from './pi-rpc'
import {
  activateHotPoolVm,
  createPierreInstance,
  destroyColdMachine,
  getConversationUploadsPath,
  getConversationWorkspacePath,
  getKnowledgePath,
  getWorkspacesPath,
  type PierreInstance,
  syncDirectoryToSlot,
  withVmCreationSlot
} from './smolvm'
import { POOL_PREFIX, recyclePoolVm, refreshPoolProviders, takePoolVm } from './vm-pool'

// How long a VM lives without any activity before being destroyed
const INACTIVITY_TIMEOUT_MS = Number(Bun.env['VM_INACTIVITY_TIMEOUT_MS'] ?? 10 * 60 * 1000)
const configuredUiResponseTimeout = Number(Bun.env['UI_RESPONSE_TIMEOUT_MS'] ?? 5 * 60 * 1000)
export const UI_RESPONSE_TIMEOUT_MS = Number.isFinite(configuredUiResponseTimeout)
  ? Math.min(10 * 60 * 1000, Math.max(1_000, configuredUiResponseTimeout))
  : 5 * 60 * 1000

// ---------------------------------------------------------------------------
// VM registry
// ---------------------------------------------------------------------------

type VmEntry = {
  instance: PierreInstance
  configId: string
  piClient: PiRpcClient
  thinkingLevel: string
  recyclePoolVm: typeof recyclePoolVm
  destroyColdMachine: typeof destroyColdMachine
  timer: ReturnType<typeof setTimeout> | null
  activeRequests: number
  pendingUiRequest: PendingUiRequest | null
}

export type UiResponseCapability = {
  requestId: string
  responseSecretHash: Uint8Array
  consumed: boolean
}

type PendingUiRequest = UiResponseCapability & {
  toolCallId: string
  onSettled: () => void
  timeout: ReturnType<typeof setTimeout> | null
}

const registry = new Map<string, VmEntry>()
const conversationReservations = new Map<string, number>()
const deferredDestructions = new Set<string>()
const pendingCreations = new Set<string>()

const maxActiveVms = (): number => {
  const value = Number(Bun.env['SMOLVM_MAX_ACTIVE'] ?? 96)
  return Number.isSafeInteger(value) && value > 0 ? value : 96
}

const vmCapacityUsed = (): number =>
  new Set([...registry.keys(), ...conversationReservations.keys(), ...pendingCreations]).size

export type AcquireVmDependencies = {
  createInstance: typeof createPierreInstance
  destroyColdMachine: typeof destroyColdMachine
  activateHotPoolVm: typeof activateHotPoolVm
  takePoolVm: typeof takePoolVm
  recyclePoolVm: typeof recyclePoolVm
  createClient: (instance: PierreInstance) => PiRpcClient
}

const defaultAcquireVmDependencies: AcquireVmDependencies = {
  createInstance: createPierreInstance,
  destroyColdMachine,
  activateHotPoolVm,
  takePoolVm,
  recyclePoolVm,
  createClient: (instance) => new PiRpcClient(instance.piProcess)
}

function armTimer(convId: string, entry: VmEntry): void {
  if (entry.timer || entry.activeRequests > 0 || isConversationReserved(convId)) return
  entry.timer = setTimeout(() => {
    entry.timer = null
    console.log(`[VM_REGISTRY] Inactivity timeout — destroying VM for conv=${convId}`)
    destroyVm(convId).catch((e) => console.error('[VM_REGISTRY] Destroy error:', e))
  }, INACTIVITY_TIMEOUT_MS)
}

function isConversationReserved(convId: string): boolean {
  return (conversationReservations.get(convId) ?? 0) > 0
}

export function conversationReservationCount(convId: string): number {
  return conversationReservations.get(convId) ?? 0
}

/**
 * Protects a conversation's staging directory without creating or acquiring a VM.
 * The returned release function is idempotent and does not affect activeRequests.
 */
export function reserveConversation(convId: string): () => void {
  conversationReservations.set(convId, conversationReservationCount(convId) + 1)
  const entry = registry.get(convId)
  if (entry?.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }

  let released = false
  return () => {
    if (released) return
    released = true

    const remaining = Math.max(0, conversationReservationCount(convId) - 1)
    if (remaining > 0) {
      conversationReservations.set(convId, remaining)
      return
    }
    conversationReservations.delete(convId)

    const current = registry.get(convId)
    if (!current) {
      deferredDestructions.delete(convId)
      return
    }
    if (current.activeRequests > 0) return
    if (deferredDestructions.delete(convId)) {
      void destroyVm(convId)
      return
    }
    armTimer(convId, current)
  }
}

export function tryReserveConversation(convId: string): (() => void) | null {
  const known =
    registry.has(convId) || conversationReservations.has(convId) || pendingCreations.has(convId)
  if (!known && vmCapacityUsed() >= maxActiveVms()) return null
  return reserveConversation(convId)
}

/** Returns true if a VM is already running for the given conversation. */
export function hasVm(convId: string): boolean {
  return registry.has(convId)
}

/**
 * Returns the VM entry for `convId`, acquiring a hot pool VM or creating a cold VM if needed.
 * Increments the active-request counter and pauses the inactivity timer so a
 * long-running turn cannot be killed mid-stream. Call `releaseVm` when done.
 */
export async function acquireVm(
  convId: string,
  configId: string,
  dependencies: AcquireVmDependencies = defaultAcquireVmDependencies
): Promise<VmEntry> {
  let entry = registry.get(convId)

  if (entry) {
    if (entry.configId !== configId) {
      console.warn(
        `[VM_REGISTRY] configId mismatch for conv=${convId}: destroying VM (was ${entry.configId}, need ${configId})`
      )
      await teardownVmEntry(convId, entry, {
        preserveUploads: true,
        throwOnDestroyError: true
      })
      entry = undefined
    } else {
      if (entry.timer) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      entry.activeRequests++
      if (entry.instance.slotWorkPath) {
        syncDirectoryToSlot(
          getConversationUploadsPath(configId, convId),
          join(entry.instance.slotWorkPath, '_uploads')
        )
      }
      return entry
    }
  }

  const reserved = isConversationReserved(convId)
  if (!reserved && !pendingCreations.has(convId) && vmCapacityUsed() >= maxActiveVms()) {
    throw new Error('VM capacity reached')
  }
  pendingCreations.add(convId)
  console.log(`[VM_REGISTRY] Creating VM for conv=${convId} config=${configId}`)
  const knowledgePath = getKnowledgePath(configId)
  const workspacePath = getConversationWorkspacePath(configId, convId)
  const autonomous = promptById(configId)?.access === 'automations'
  const poolSlot = dependencies.takePoolVm()
  let instance: PierreInstance
  try {
    if (poolSlot) {
      console.log(`[VM_REGISTRY] Using hot pool VM ${poolSlot.name} for conv=${convId}`)
      instance = await dependencies.activateHotPoolVm(
        poolSlot,
        knowledgePath,
        workspacePath,
        autonomous
      )
    } else {
      console.log(`[VM_REGISTRY] Pool empty — creating VM from .smolmachine for conv=${convId}`)
      instance = await dependencies.createInstance(convId, configId, autonomous)
    }
  } catch (error) {
    pendingCreations.delete(convId)
    if (poolSlot) {
      void dependencies
        .recyclePoolVm(poolSlot.name)
        .catch((e) => console.error(`[VM_REGISTRY] Cleanup error for ${poolSlot.name}:`, e))
    }
    throw error
  }

  let piClient: PiRpcClient | undefined = instance.piClient
  if (piClient) {
    pendingCreations.delete(convId)
  } else {
    try {
      piClient = dependencies.createClient(instance)
      await piClient.waitForReady()
      console.log(`[VM_REGISTRY] PiRpcClient ready for conv=${convId}`)
    } catch (err) {
      console.error(`[VM_REGISTRY] Pi RPC init failed for conv=${convId}, cleaning up VM:`, err)
      piClient?.dispose()
      try {
        instance.piProcess.kill()
      } catch {}
      if (instance.fromPool) {
        void dependencies
          .recyclePoolVm(instance.name)
          .catch((e) => console.error('[VM_REGISTRY] Cleanup error:', e))
      } else {
        await dependencies
          .destroyColdMachine(instance.name)
          .catch((e) => console.error('[VM_REGISTRY] Cleanup error:', e))
      }
      throw err
    } finally {
      pendingCreations.delete(convId)
    }
  }

  const readyClient = piClient
  entry = {
    instance,
    configId,
    piClient: readyClient,
    thinkingLevel: instance.thinkingLevel,
    recyclePoolVm: dependencies.recyclePoolVm,
    destroyColdMachine: dependencies.destroyColdMachine,
    timer: null,
    activeRequests: 1,
    pendingUiRequest: null
  }
  registry.set(convId, entry)
  readyClient.onClose(() => {
    const current = registry.get(convId)
    if (!current || current.piClient !== readyClient) return
    console.warn(`[VM_REGISTRY] Pi process closed unexpectedly for conv=${convId}`)
    if (current.activeRequests > 0 || isConversationReserved(convId)) {
      deferredDestructions.add(convId)
      return
    }
    void teardownVmEntry(convId, current, { preserveUploads: false })
  })
  return entry
}

/**
 * Decrements the active-request counter for `convId`.
 * When it reaches zero, arms the inactivity timer.
 */
export function releaseVm(convId: string): void {
  const entry = registry.get(convId)
  if (!entry) return

  entry.activeRequests = Math.max(0, entry.activeRequests - 1)
  if (entry.activeRequests > 0 || isConversationReserved(convId)) return
  if (deferredDestructions.delete(convId)) {
    void destroyVm(convId)
    return
  }
  armTimer(convId, entry)
}

/**
 * Records the RPC input request that Pi itself is awaiting. This stores only
 * correlation and ownership metadata; Pi owns the pending promise.
 */
export function registerPendingUiRequest(
  convId: string,
  request: { requestId: string; toolCallId: string; responseSecret: string },
  onSettled: () => void
): boolean {
  const entry = registry.get(convId)
  if (!entry || entry.pendingUiRequest) return false

  const pending: PendingUiRequest = {
    requestId: request.requestId,
    toolCallId: request.toolCallId,
    responseSecretHash: hashResponseSecret(request.responseSecret),
    consumed: false,
    onSettled,
    timeout: null
  }
  entry.pendingUiRequest = pending
  pending.timeout = scheduleUiResponseExpiry(() => {
    if (entry.pendingUiRequest !== pending || !expireUiResponseCapability(pending)) return
    pending.timeout = null
    entry.pendingUiRequest = null
    entry.piClient.sendRaw({
      type: 'extension_ui_response',
      id: pending.requestId,
      cancelled: true
    })
    pending.onSettled()
  })
  return true
}

export function expireUiResponseCapability(capability: UiResponseCapability): boolean {
  if (capability.consumed) return false
  capability.consumed = true
  return true
}

export function scheduleUiResponseExpiry(
  onExpire: () => void,
  timeoutMs = UI_RESPONSE_TIMEOUT_MS
): ReturnType<typeof setTimeout> {
  return setTimeout(onExpire, timeoutMs)
}

export function hashResponseSecret(secret: string): Uint8Array {
  return new Bun.CryptoHasher('sha256').update(secret).digest()
}

/** Compares fixed-size hashes so invalid secret lengths do not leak timing information. */
export function matchesResponseSecret(expectedHash: Uint8Array, candidate: string): boolean {
  const candidateHash = hashResponseSecret(candidate)
  let mismatch = expectedHash.length ^ candidateHash.length
  for (let index = 0; index < candidateHash.length; index++) {
    mismatch |= (expectedHash[index] ?? 0) ^ candidateHash[index]!
  }
  return mismatch === 0
}

/** Atomically validates and spends a single-use UI response capability. */
export function consumeUiResponseCapability(
  capability: UiResponseCapability,
  requestId: string,
  responseSecret: string
): boolean {
  if (
    capability.consumed ||
    capability.requestId !== requestId ||
    !matchesResponseSecret(capability.responseSecretHash, responseSecret)
  ) {
    return false
  }
  capability.consumed = true
  return true
}

/**
 * Consumes a capability-authenticated UI response once and forwards it to the same Pi process.
 * All mismatches return false without revealing which correlation field differed.
 */
export function respondToPendingUiRequest(
  convId: string,
  requestId: string,
  responseSecret: string,
  value: string
): boolean {
  const entry = registry.get(convId)
  const pending = entry?.pendingUiRequest
  if (!entry || !pending || !consumeUiResponseCapability(pending, requestId, responseSecret)) {
    return false
  }

  if (pending.timeout) clearTimeout(pending.timeout)
  pending.timeout = null
  entry.pendingUiRequest = null
  pending.onSettled()
  entry.piClient.sendRaw({ type: 'extension_ui_response', id: requestId, value })
  return true
}

/** Cancels Pi's native UI wait and removes the server-side correlation metadata. */
export function cancelPendingUiRequest(convId: string): void {
  const entry = registry.get(convId)
  if (!entry) return
  cancelPendingUiRequestForEntry(entry)
}

function cancelPendingUiRequestForEntry(entry: VmEntry): void {
  const pending = entry.pendingUiRequest
  if (!pending) return
  pending.consumed = true
  if (pending.timeout) clearTimeout(pending.timeout)
  pending.timeout = null
  entry.pendingUiRequest = null
  pending.onSettled()
  entry.piClient.sendRaw({
    type: 'extension_ui_response',
    id: pending.requestId,
    cancelled: true
  })
}

/**
 * Removes non-pool VMs and non-pool conversation workspaces orphaned by a previous server crash
 * or restart. Preserves `pierre-pool-*` VMs and `workspaces/_pool` for `initVmPool()` reuse.
 */
export async function cleanupOrphanedVms(): Promise<void> {
  let machines: { name: string }[] = []
  try {
    const raw = await $`${SMOLVM_BIN} machine ls --json`.json()
    machines = Array.isArray(raw) ? raw : (raw?.machines ?? [])
  } catch {
    // Workspaces are still safe to clean before the server accepts requests.
  }

  for (const { name } of machines) {
    if (typeof name !== 'string' || name.startsWith(POOL_PREFIX)) continue
    await withVmCreationSlot(async () => {
      await $`${SMOLVM_BIN} machine stop --name ${name}`.nothrow().quiet()
      await $`${SMOLVM_BIN} machine delete --name ${name} -f`.nothrow().quiet()
    }, 'low')
    console.log(`[VM_REGISTRY] Deleted orphaned VM: ${name}`)
  }

  const workspacesRoot = resolvePathWithin(datastorePaths().root, 'workspaces')
  if (!existsSync(workspacesRoot)) return
  for (const entry of readdirSync(workspacesRoot)) {
    if (entry === '_pool') continue
    await rm(resolvePathWithin(workspacesRoot, entry), { recursive: true, force: true }).catch(
      (error) => console.warn('[VM_REGISTRY] Failed to cleanup orphaned workspace:', error)
    )
  }
}

/**
 * Stops the inactivity timer, disposes the PiRpcClient, kills Pi, cleans workspace files,
 * and recycles (pool VM) or deletes (cold VM) the underlying smolVM.
 */
async function teardownVmEntry(
  convId: string,
  entry: VmEntry,
  options: { preserveUploads: boolean; throwOnDestroyError?: boolean }
): Promise<void> {
  if (registry.get(convId) !== entry) return

  registry.delete(convId)
  deferredDestructions.delete(convId)
  if (entry.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
  cancelPendingUiRequestForEntry(entry)
  entry.piClient.dispose()
  try {
    entry.instance.piProcess.kill()
  } catch {}

  if (!options.preserveUploads) {
    try {
      await cleanupConversationWorkspace(getWorkspacesPath(entry.configId), convId)
    } catch (error) {
      console.warn(`[VM_REGISTRY] Failed to cleanup workspace for conv=${convId}:`, error)
    }
  }

  if (entry.instance.fromPool) {
    void entry.recyclePoolVm(entry.instance.name).catch((error) => {
      console.error(`[VM_REGISTRY] Failed to recycle pool VM ${entry.instance.name}:`, error)
    })
    return
  }

  try {
    await entry.destroyColdMachine(entry.instance.name)
    console.log(`[VM_REGISTRY] VM ${entry.instance.name} destroyed (conv=${convId})`)
  } catch (error) {
    console.error(`[VM_REGISTRY] Failed to destroy VM ${entry.instance.name}:`, error)
    if (options.throwOnDestroyError) throw error
  }
}

export async function destroyVm(convId: string): Promise<void> {
  const entry = registry.get(convId)
  if (isConversationReserved(convId) || (entry?.activeRequests ?? 0) > 0) {
    deferredDestructions.add(convId)
    return
  }
  if (!entry) return

  await teardownVmEntry(convId, entry, { preserveUploads: false })
}

/** Applies new provider/model credentials to subsequent turns without interrupting active work. */
export async function invalidateAllVms(
  refreshProviders: typeof refreshPoolProviders = refreshPoolProviders
): Promise<void> {
  const idle: Array<Promise<void>> = []
  for (const [convId, entry] of registry) {
    if (entry.activeRequests > 0 || isConversationReserved(convId)) {
      deferredDestructions.add(convId)
    } else {
      idle.push(teardownVmEntry(convId, entry, { preserveUploads: false }))
    }
  }
  void refreshProviders().catch((error) =>
    console.error('[VM_REGISTRY] Failed to refresh pool providers:', error)
  )
  await Promise.allSettled(idle)
}

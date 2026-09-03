import type { FileSink, Subprocess } from 'bun'
import { $ } from 'bun'

import { cleanupConversationUploads } from './ai-attachments'
import type { PierreInstance } from './smolvm'
import {
  createPierreInstance,
  destroyPierreInstance,
  getConversationUploadsPath,
  getKnowledgePath,
  getUploadsPath,
  startPierreOnPoolVm
} from './smolvm'
import { takePoolVm } from './vm-pool'

// How long a VM lives without any activity before being destroyed
const INACTIVITY_TIMEOUT_MS = Number(Bun.env['VM_INACTIVITY_TIMEOUT_MS'] ?? 10 * 60 * 1000)
const configuredUiResponseTimeout = Number(Bun.env['UI_RESPONSE_TIMEOUT_MS'] ?? 5 * 60 * 1000)
export const UI_RESPONSE_TIMEOUT_MS = Number.isFinite(configuredUiResponseTimeout)
  ? Math.min(10 * 60 * 1000, Math.max(1_000, configuredUiResponseTimeout))
  : 5 * 60 * 1000

// ---------------------------------------------------------------------------
// PiRpcClient — JSONL stdin/stdout bridge to the Pi RPC subprocess
// ---------------------------------------------------------------------------

type PendingCommand = {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
}

/**
 * Manages the JSONL RPC protocol between Pierre (host) and Pi (inside smolVM).
 *
 * - Commands sent via `sendCommand` receive a response matched by `id`
 * - Events (streaming, tool calls, agent_end…) are dispatched to `onEvent` listeners
 * - `dispose()` stops all listeners; the subprocess itself is killed by `destroyPierreInstance`
 */
class PiRpcClient {
  private readonly process: Subprocess<'pipe', 'pipe', 'inherit'>
  private readonly pendingCommands = new Map<string, PendingCommand>()
  private readonly eventListeners = new Set<(event: Record<string, unknown>) => void>()
  private disposed = false

  constructor(process: Subprocess<'pipe', 'pipe', 'inherit'>) {
    this.process = process
    this.startReader()
  }

  private async startReader(): Promise<void> {
    let buffer = ''
    const decoder = new TextDecoder()
    try {
      for await (const chunk of this.process.stdout) {
        if (this.disposed) break
        buffer += decoder.decode(chunk as Uint8Array, { stream: true })
        // Pi docs: split on \n only (NOT \r\n, NOT Unicode line separators)
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const msg = JSON.parse(trimmed) as Record<string, unknown>
            const id = msg['id'] as string | undefined
            if (id !== undefined && this.pendingCommands.has(id)) {
              const pending = this.pendingCommands.get(id)!
              this.pendingCommands.delete(id)
              pending.resolve(msg)
            } else {
              for (const listener of this.eventListeners) listener(msg)
            }
          } catch {
            console.warn('[PI_RPC] Unparseable line:', trimmed.slice(0, 200))
          }
        }
      }
    } catch (err) {
      if (!this.disposed) console.warn('[PI_RPC] Reader error:', err)
    }
    // Fail any commands still waiting
    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('Pi process stdout closed'))
    }
    this.pendingCommands.clear()
  }

  /** Sends a command with a unique id and waits for the matching response. */
  async sendCommand<T = Record<string, unknown>>(
    cmd: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<T> {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const cleanup = () => {
        if (timer !== undefined) clearTimeout(timer)
        this.pendingCommands.delete(id)
      }
      this.pendingCommands.set(id, {
        resolve: (data) => {
          cleanup()
          resolve(data as T)
        },
        reject: (err) => {
          cleanup()
          reject(err)
        }
      })
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          this.pendingCommands.delete(id)
          reject(new Error(`Pi command "${cmd['type']}" timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }
      this.write(JSON.stringify({ ...cmd, id }))
    })
  }

  /** Sends a command without waiting for a response (fire-and-forget). */
  sendRaw(cmd: Record<string, unknown>): void {
    this.write(JSON.stringify(cmd))
  }

  /** Subscribes to Pi events (lines without a matching command id). Returns an unsubscribe fn. */
  onEvent(listener: (event: Record<string, unknown>) => void): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  /**
   * Polls Pi with `get_session_stats` until it responds, confirming RPC is ready.
   * Replaces the TCP `waitForPort` from the Copilot architecture.
   */
  async waitForReady(timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        await this.sendCommand({ type: 'get_session_stats' }, 500)
        return
      } catch {
        await new Promise<void>((r) => setTimeout(r, 300))
      }
    }
    throw new Error('Timed out waiting for Pi RPC to be ready')
  }

  /** Stops event dispatching; the subprocess is killed separately by destroyPierreInstance. */
  dispose(): void {
    this.disposed = true
    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('Pi RPC client disposed'))
    }
    this.pendingCommands.clear()
    this.eventListeners.clear()
  }

  private write(line: string): void {
    const stdin = this.process.stdin as FileSink
    stdin.write(line + '\n')
    Promise.resolve(stdin.flush()).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// VM registry
// ---------------------------------------------------------------------------

type VmEntry = {
  instance: PierreInstance
  configId: string
  piClient: PiRpcClient
  destroyInstance: typeof destroyPierreInstance
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

export type AcquireVmDependencies = {
  createInstance: typeof createPierreInstance
  destroyInstance: typeof destroyPierreInstance
  startPoolInstance: typeof startPierreOnPoolVm
  takePoolInstance: typeof takePoolVm
  createClient: (instance: PierreInstance) => PiRpcClient
}

const defaultAcquireVmDependencies: AcquireVmDependencies = {
  createInstance: createPierreInstance,
  destroyInstance: destroyPierreInstance,
  startPoolInstance: startPierreOnPoolVm,
  takePoolInstance: takePoolVm,
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

export function isConversationReserved(convId: string): boolean {
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

/** Returns true if a VM is already running for the given conversation. */
export function hasVm(convId: string): boolean {
  return registry.has(convId)
}

/**
 * Returns the VM entry for `convId`, creating one if it does not exist yet.
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
      return entry
    }
  }

  console.log(`[VM_REGISTRY] Creating VM for conv=${convId} config=${configId}`)
  const knowledgePath = getKnowledgePath(configId)
  const uploadsPath = getConversationUploadsPath(configId, convId)
  const poolName = dependencies.takePoolInstance()
  let instance: PierreInstance
  if (poolName) {
    console.log(`[VM_REGISTRY] Using pool VM ${poolName} for conv=${convId}`)
    instance = await dependencies.startPoolInstance(poolName, knowledgePath, uploadsPath, convId)
  } else {
    console.log(`[VM_REGISTRY] Pool empty — creating VM from .smolmachine for conv=${convId}`)
    instance = await dependencies.createInstance(convId, configId)
  }

  let piClient: PiRpcClient
  try {
    piClient = dependencies.createClient(instance)
    await piClient.waitForReady()
    console.log(`[VM_REGISTRY] PiRpcClient ready for conv=${convId}`)
  } catch (err) {
    console.error(`[VM_REGISTRY] Pi RPC init failed for conv=${convId}, cleaning up VM:`, err)
    await dependencies
      .destroyInstance(instance)
      .catch((e) => console.error('[VM_REGISTRY] Cleanup error:', e))
    throw err
  }

  entry = {
    instance,
    configId,
    piClient,
    destroyInstance: dependencies.destroyInstance,
    timer: null,
    activeRequests: 1,
    pendingUiRequest: null
  }
  registry.set(convId, entry)
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
 * Lists all smolvm machines and force-deletes them.
 * Called once at startup to remove VMs orphaned by a previous server crash or restart.
 */
export async function cleanupOrphanedVms(): Promise<void> {
  let machines: { name: string }[]
  try {
    const raw = await $`smolvm machine ls --json`.json()
    machines = Array.isArray(raw) ? raw : (raw?.machines ?? [])
  } catch {
    return
  }

  await Promise.allSettled(
    machines.map(async ({ name }) => {
      try {
        await $`smolvm machine stop --name ${name}`.quiet()
      } catch {
        // already stopped or unreachable — proceed to delete
      }
      await $`smolvm machine delete --name ${name} -f`.quiet()
      console.log(`[VM_REGISTRY] Deleted orphaned VM: ${name}`)
    })
  )
}

/**
 * Stops the inactivity timer, disposes the PiRpcClient,
 * and destroys the smolVM associated with `convId`.
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

  if (!options.preserveUploads) {
    try {
      await cleanupConversationUploads(getUploadsPath(entry.configId), convId)
    } catch (error) {
      console.warn(`[VM_REGISTRY] Failed to cleanup uploads for conv=${convId}:`, error)
    }
  }

  try {
    await entry.destroyInstance(entry.instance)
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

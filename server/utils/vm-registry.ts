import type { FileSink, Subprocess } from 'bun'
import { $ } from 'bun'

import type { PierreInstance } from './smolvm'
import {
  createPierreInstance,
  destroyPierreInstance,
  getKnowledgePath,
  startPierreOnPoolVm
} from './smolvm'
import { takePoolVm } from './vm-pool'

// How long a VM lives without any activity before being destroyed
const INACTIVITY_TIMEOUT_MS = Number(Bun.env['VM_INACTIVITY_TIMEOUT_MS'] ?? 10 * 60 * 1000)

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
export class PiRpcClient {
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
  timer: ReturnType<typeof setTimeout> | null
  activeRequests: number
}

const registry = new Map<string, VmEntry>()

function armTimer(convId: string, entry: VmEntry): void {
  entry.timer = setTimeout(() => {
    console.log(`[VM_REGISTRY] Inactivity timeout — destroying VM for conv=${convId}`)
    destroyVm(convId).catch((e) => console.error('[VM_REGISTRY] Destroy error:', e))
  }, INACTIVITY_TIMEOUT_MS)
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
export async function acquireVm(convId: string, configId: string): Promise<VmEntry> {
  let entry = registry.get(convId)

  if (entry) {
    if (entry.configId !== configId) {
      console.warn(
        `[VM_REGISTRY] configId mismatch for conv=${convId}: destroying VM (was ${entry.configId}, need ${configId})`
      )
      await destroyVm(convId)
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
  const poolName = takePoolVm()
  let instance: PierreInstance
  if (poolName) {
    console.log(`[VM_REGISTRY] Using pool VM ${poolName} for conv=${convId}`)
    instance = await startPierreOnPoolVm(poolName, knowledgePath)
  } else {
    console.log(`[VM_REGISTRY] Pool empty — creating VM from .smolmachine for conv=${convId}`)
    instance = await createPierreInstance(convId, configId)
  }

  let piClient: PiRpcClient
  try {
    piClient = new PiRpcClient(instance.piProcess)
    await piClient.waitForReady()
    console.log(`[VM_REGISTRY] PiRpcClient ready for conv=${convId}`)
  } catch (err) {
    console.error(`[VM_REGISTRY] Pi RPC init failed for conv=${convId}, cleaning up VM:`, err)
    await destroyPierreInstance(instance).catch((e) =>
      console.error('[VM_REGISTRY] Cleanup error:', e)
    )
    throw err
  }

  entry = { instance, configId, piClient, timer: null, activeRequests: 1 }
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
  if (entry.activeRequests === 0 && !entry.timer) {
    armTimer(convId, entry)
  }
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
export async function destroyVm(convId: string): Promise<void> {
  const entry = registry.get(convId)
  if (!entry) return

  registry.delete(convId)
  if (entry.timer) clearTimeout(entry.timer)

  entry.piClient.dispose()

  try {
    await destroyPierreInstance(entry.instance)
    console.log(`[VM_REGISTRY] VM ${entry.instance.name} destroyed (conv=${convId})`)
  } catch (e) {
    console.error(`[VM_REGISTRY] Failed to destroy VM ${entry.instance.name}:`, e)
  }
}

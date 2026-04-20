import { CopilotClient } from '@github/copilot-sdk'
import { $ } from 'bun'

import type { PierreInstance } from './smolvm'
import { createPierreInstance, destroyPierreInstance } from './smolvm'

// How long a VM lives without any activity before being destroyed
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

type VmEntry = {
  instance: PierreInstance
  configId: string
  client: CopilotClient
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
        `[VM_REGISTRY] configId mismatch for conv=${convId}: expected ${entry.configId}, got ${configId}`
      )
    }
    // Pause the inactivity timer while a request is in flight
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
    entry.activeRequests++
    return entry
  }

  console.log(`[VM_REGISTRY] Creating VM for conv=${convId} config=${configId}`)
  const instance = await createPierreInstance(convId, configId)

  let client: CopilotClient
  try {
    // When using cliUrl, the CLI manages its own auth — do not pass useLoggedInUser
    client = new CopilotClient({ cliUrl: `localhost:${instance.hostPort}` })
    await client.start()
    console.log(`[VM_REGISTRY] CopilotClient connected to VM CLI on port ${instance.hostPort}`)
  } catch (err) {
    // VM was created but client init failed — destroy it to avoid orphaned VMs
    console.error(`[VM_REGISTRY] Client init failed for conv=${convId}, cleaning up VM:`, err)
    await destroyPierreInstance(instance).catch((e) =>
      console.error('[VM_REGISTRY] Cleanup error:', e)
    )
    throw err
  }

  entry = { instance, configId, client, timer: null, activeRequests: 1 }
  registry.set(convId, entry)
  return entry
}

/**
 * Decrements the active-request counter for `convId`.
 * When it reaches zero, arms the 30-minute inactivity timer.
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
    // smolvm unavailable or no machines — nothing to do
    return
  }

  await Promise.allSettled(
    machines.map(async ({ name }) => {
      try {
        await $`smolvm machine stop --name ${name}`.quiet()
      } catch {
        // already stopped or unreachable — proceed to delete
      }
      await $`smolvm machine delete -f ${name}`.quiet()
      console.log(`[VM_REGISTRY] Deleted orphaned VM: ${name}`)
    })
  )
}

/**
 * Stops the inactivity timer, gracefully stops the `CopilotClient`,
 * and destroys the smolVM associated with `convId`.
 */
export async function destroyVm(convId: string): Promise<void> {
  const entry = registry.get(convId)
  if (!entry) return

  registry.delete(convId)
  if (entry.timer) clearTimeout(entry.timer)

  try {
    await entry.client.stop()
  } catch (e) {
    console.warn(`[VM_REGISTRY] Client stop error for conv=${convId}:`, e)
  }

  try {
    await destroyPierreInstance(entry.instance)
    console.log(`[VM_REGISTRY] VM ${entry.instance.name} destroyed (conv=${convId})`)
  } catch (e) {
    console.error(`[VM_REGISTRY] Failed to destroy VM ${entry.instance.name}:`, e)
  }
}

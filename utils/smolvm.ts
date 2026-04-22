import { createServer } from 'node:net'
import { resolve } from 'node:path'

import { $ } from 'bun'
import type { Subprocess } from 'bun'

const PROJECT_ROOT = resolve(import.meta.dir, '..')

// Port on which the Copilot CLI listens inside the VM
const VM_CLI_PORT = 9000

/** Finds a free TCP port on the host by briefly binding to port 0. */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (!addr || typeof addr === 'string') return reject(new Error('Could not allocate port'))
      const port = addr.port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

/** Polls until the host port is accepting TCP connections (max `timeoutMs`). */
async function waitForPort(port: number, timeoutMs = 30_000): Promise<void> {
  const { createConnection } = await import('node:net')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const sock = createConnection({ host: '127.0.0.1', port }, () => {
        sock.destroy()
        resolve(true)
      })
      sock.on('error', () => {
        sock.destroy()
        resolve(false)
      })
    })
    if (open) return
    await new Promise<void>((r) => setTimeout(r, 200))
  }
  throw new Error(`Timed out waiting for CLI server on port ${port}`)
}

export type PierreInstance = {
  name: string
  hostPort: number
  /** Long-lived exec subprocess that keeps the Copilot CLI alive inside the VM. */
  copilotProcess: Subprocess
}

/**
 * Creates and starts a smolVM instance for a Pierre conversation.
 *
 * - Mounts `datastores/<service>/knowledge/<configId>` into `/knowledge` in the VM
 * - Injects BYOK provider env vars into `/root/.bashrc`
 * - Starts the Copilot CLI in TCP server mode inside the VM
 * - Forwards a free host port → VM port 9000
 * - Waits until the CLI server is ready before returning
 *
 * Returns `{ name, hostPort }`. Call `destroyPierreInstance` when done.
 */
export async function createPierreInstance(
  convId: string,
  configId: string
): Promise<PierreInstance> {
  const name = convId
  const service = Bun.env['SERVICE']
  const hostPort = await findFreePort()

  const knowledgePath = resolve(PROJECT_ROOT, 'datastores', service!, 'knowledge', configId)

  await $`smolvm machine create --net --from config/smolvm/pierre.smolmachine --volume ${knowledgePath}:/knowledge --port ${hostPort}:${VM_CLI_PORT} ${name}`
  await $`smolvm machine start --name ${name}`

  // Start copilot as a FOREGROUND exec — keeping this subprocess alive keeps
  // copilot running inside the VM. The exec session ends only when we kill it.
  const startCmd = `source /root/.bashrc && exec /usr/local/bin/copilot --headless --no-auto-update --no-auto-login --port ${VM_CLI_PORT}`
  const copilotProcess = Bun.spawn(
    ['smolvm', 'machine', 'exec', '--name', name, '--', 'bash', '-c', startCmd],
    { stdout: 'ignore', stderr: 'ignore' }
  )

  // Wait until the forwarded port accepts connections on the host
  await waitForPort(hostPort)

  console.log(`[SMOLVM] VM ${name} ready — CLI on host port ${hostPort}`)
  return { name, hostPort, copilotProcess }
}

/**
 * Kills the Copilot exec subprocess, then stops and deletes the smolVM.
 */
export async function destroyPierreInstance(instance: PierreInstance): Promise<void> {
  instance.copilotProcess.kill()
  await $`smolvm machine stop --name ${instance.name}`
  await $`smolvm machine delete -f ${instance.name}`
}

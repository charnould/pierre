import { arch as nodeArch } from 'node:os'
import { resolve } from 'node:path'

import { $ } from 'bun'
import type { Subprocess } from 'bun'

const PROJECT_ROOT = resolve(import.meta.dir, '..')

export type PierreInstance = {
  name: string
  /** Long-lived exec subprocess that keeps Pi running inside the VM (stdin/stdout piped). */
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'>
}

/**
 * Creates and starts a smolVM instance for a Pierre conversation.
 *
 * - Mounts `datastores/<service>/knowledge/<configId>` into `/knowledge` in the VM
 * - Starts Pi in RPC mode inside the VM with stdin/stdout as JSONL transport
 * - Waits until the Pi subprocess is running before returning
 *
 * Returns `{ name, piProcess }`. Call `destroyPierreInstance` when done.
 */
export async function createPierreInstance(
  convId: string,
  configId: string
): Promise<PierreInstance> {
  const name = convId
  const service = Bun.env['SERVICE']

  // Pick the smolmachine matching the host CPU architecture
  const arch = nodeArch() === 'x64' ? 'amd64' : 'arm64'
  const smolmachinePath = `config/smolvm/pierre-${arch}.smolmachine`

  const knowledgePath = resolve(PROJECT_ROOT, 'datastores', service!, 'knowledge', configId)

  await $`smolvm machine create --net --from ${smolmachinePath} --volume ${knowledgePath}:/knowledge ${name}`
  await $`smolvm machine start --name ${name}`

  // Verify Pi binary exists inside the VM
  const check = await $`smolvm machine exec --name ${name} -- sh -c "which pi 2>&1; uname -m"`
    .quiet()
    .nothrow()
  console.log(`[SMOLVM] Preflight check:\n${check.stdout.toString()}${check.stderr.toString()}`)

  // Build Pi startup args — inject BYOK provider credentials via -e flags
  const providerType = (Bun.env['AI_TYPE'] ?? 'anthropic').toLowerCase()
  const model = Bun.env['AI_MODEL'] ?? 'claude-sonnet-4-5'
  const apiKey = Bun.env['AI_API_KEY'] ?? ''
  const baseUrl = Bun.env['AI_BASE_URL'] ?? ''

  const envArgs: string[] = []
  if (apiKey) {
    if (providerType === 'openai' || providerType === 'azure') {
      envArgs.push('-e', `OPENAI_API_KEY=${apiKey}`)
      if (baseUrl) envArgs.push('-e', `OPENAI_BASE_URL=${baseUrl}`)
    } else {
      envArgs.push('-e', `ANTHROPIC_API_KEY=${apiKey}`)
    }
  }

  // -i keeps stdin open so Pi (RPC mode) can read commands; -w sets the cwd.
  // Pi reads AGENTS.md from its cwd (/knowledge) at startup.
  const piProcess = Bun.spawn(
    [
      'smolvm',
      'machine',
      'exec',
      '--name',
      name,
      '-i',
      '-w',
      '/knowledge',
      ...envArgs,
      '--',
      'pi',
      '--mode',
      'rpc',
      '--no-session',
      '--provider',
      providerType,
      '--model',
      model
    ],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' }
  ) as Subprocess<'pipe', 'pipe', 'inherit'>

  piProcess.exited.then((code) =>
    console.log(`[SMOLVM] Pi process exited with code ${code} for VM ${name}`)
  )

  console.log(`[SMOLVM] VM ${name} ready — Pi RPC subprocess started`)
  return { name, piProcess }
}

/**
 * Kills the Pi exec subprocess, then stops and deletes the smolVM.
 */
export async function destroyPierreInstance(instance: PierreInstance): Promise<void> {
  instance.piProcess.kill()
  await $`smolvm machine stop --name ${instance.name}`
  await $`smolvm machine delete -f ${instance.name}`
}

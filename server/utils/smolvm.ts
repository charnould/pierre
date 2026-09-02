import { join } from 'node:path'

import { $ } from 'bun'
import type { Subprocess } from 'bun'

import { datastorePaths } from './paths'
import { getSmolmachinePath, returnPoolVm } from './vm-pool'

export type PierreInstance = {
  name: string
  knowledgePath: string
  fromPool: boolean
  /** Long-lived exec subprocess that keeps Pi running inside the VM (stdin/stdout piped). */
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'>
}

export function getKnowledgePath(configId: string): string {
  return join(datastorePaths().knowledge, configId)
}

function buildPiEnvArgs(): string[] {
  const providerType = (Bun.env['AI_TYPE'] ?? 'anthropic').toLowerCase()
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
  return envArgs
}

/** Faster Pi RPC boot: skip extension/skill/template discovery and startup network I/O. */
const PI_LEAN_ARGS = ['-ne', '-ns', '-np', '--no-themes', '--offline'] as const

function spawnPiProcess(name: string): Subprocess<'pipe', 'pipe', 'inherit'> {
  const providerType = (Bun.env['AI_TYPE'] ?? 'anthropic').toLowerCase()
  const model = Bun.env['AI_MODEL'] ?? 'claude-sonnet-4-5'

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
      ...buildPiEnvArgs(),
      '--',
      'pi',
      '--mode',
      'rpc',
      '--no-session',
      '--provider',
      providerType,
      '--model',
      model,
      ...PI_LEAN_ARGS
    ],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' }
  ) as Subprocess<'pipe', 'pipe', 'inherit'>

  piProcess.exited.then((code) =>
    console.log(`[SMOLVM] Pi process exited with code ${code} for VM ${name}`)
  )

  return piProcess
}

/**
 * Configures a pre-created pool VM with the knowledge mount, starts it, and spawns Pi.
 * Skips .smolmachine extraction (~15s) already paid at server startup.
 */
export async function startPierreOnPoolVm(
  name: string,
  knowledgePath: string
): Promise<PierreInstance> {
  await $`smolvm machine update --name ${name} -v ${knowledgePath}:/knowledge --net`
  await $`smolvm machine start --name ${name}`

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] Pool VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, fromPool: true, piProcess }
}

/**
 * Creates and starts a smolVM instance for a Pierre conversation (slow path).
 * Used when the VM pool is empty.
 */
export async function createPierreInstance(
  convId: string,
  configId: string
): Promise<PierreInstance> {
  const name = convId
  const knowledgePath = getKnowledgePath(configId)

  await $`smolvm machine create --net --from ${getSmolmachinePath()} --volume ${knowledgePath}:/knowledge --name ${name}`
  await $`smolvm machine start --name ${name}`

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, fromPool: false, piProcess }
}

/**
 * Kills the Pi exec subprocess, then stops the smolVM.
 * Pool VMs are returned to the pool; others are deleted.
 */
export async function destroyPierreInstance(instance: PierreInstance): Promise<void> {
  instance.piProcess.kill()
  await $`smolvm machine stop --name ${instance.name}`.nothrow().quiet()

  if (instance.fromPool) {
    await $`smolvm machine update --name ${instance.name} --remove-volume ${instance.knowledgePath}:/knowledge`
      .nothrow()
      .quiet()
    returnPoolVm(instance.name)
  } else {
    await $`smolvm machine delete --name ${instance.name} -f`
  }
}

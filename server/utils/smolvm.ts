import { $ } from 'bun'
import type { Subprocess } from 'bun'

import { assertCanonicalConversationId } from './ai-attachments'
import { datastorePaths, resolvePathWithin } from './paths'
import { getSmolmachinePath, returnPoolVm } from './vm-pool'

export type PierreInstance = {
  name: string
  knowledgePath: string
  uploadsPath: string
  uploadsTarget: string
  fromPool: boolean
  /** Long-lived exec subprocess that keeps Pi running inside the VM (stdin/stdout piped). */
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'>
}

export function getKnowledgePath(configId: string): string {
  return resolvePathWithin(datastorePaths().knowledge, configId)
}

/** Stable attachment storage, deliberately outside directories rebuilt by the knowledge pipeline. */
export function getUploadsPath(configId: string): string {
  const uploadsRoot = resolvePathWithin(datastorePaths().root, 'uploads')
  return resolvePathWithin(uploadsRoot, configId)
}

export function getConversationUploadsPath(configId: string, convId: string): string {
  return resolvePathWithin(getUploadsPath(configId), assertCanonicalConversationId(convId))
}

export function getConversationUploadsMountPath(convId: string): string {
  return `/knowledge/_uploads/${assertCanonicalConversationId(convId)}`
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
const PI_LEAN_ARGS = ['--no-extensions', '-ns', '-np', '--no-themes', '--offline'] as const
const ASK_USER_EXTENSION_PATH = '/opt/pierre/extensions/ask-user.ts'

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
      ...PI_LEAN_ARGS,
      '-e',
      ASK_USER_EXTENSION_PATH
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
  knowledgePath: string,
  uploadsPath: string,
  convId: string
): Promise<PierreInstance> {
  const uploadsTarget = getConversationUploadsMountPath(convId)
  await $`mkdir -p ${uploadsPath}`
  await $`smolvm machine update --name ${name} -v ${knowledgePath}:/knowledge -v ${uploadsPath}:${uploadsTarget} --net`
  await $`smolvm machine start --name ${name}`

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] Pool VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, uploadsPath, uploadsTarget, fromPool: true, piProcess }
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
  const uploadsPath = getConversationUploadsPath(configId, convId)
  const uploadsTarget = getConversationUploadsMountPath(convId)
  await $`mkdir -p ${uploadsPath}`

  await $`smolvm machine create --net --from ${getSmolmachinePath()} --volume ${knowledgePath}:/knowledge --volume ${uploadsPath}:${uploadsTarget} --name ${name}`
  await $`smolvm machine start --name ${name}`

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, uploadsPath, uploadsTarget, fromPool: false, piProcess }
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
    await $`smolvm machine update --name ${instance.name} --remove-volume ${instance.uploadsPath}:${instance.uploadsTarget}`
      .nothrow()
      .quiet()
    returnPoolVm(instance.name)
  } else {
    await $`smolvm machine delete --name ${instance.name} -f`
  }
}

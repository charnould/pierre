import { $ } from 'bun'
import type { Subprocess } from 'bun'

import { assertCanonicalConversationId } from './ai-attachments'
import { datastorePaths, resolvePathWithin } from './paths'
import { readAi, readProviders } from './providers'
import { getSmolmachinePath, returnPoolVm, vmResources, withVmCreationSlot } from './vm-pool'

export type PierreInstance = {
  name: string
  knowledgePath: string
  workspacePath: string
  fromPool: boolean
  /** Long-lived exec subprocess that keeps Pi running inside the VM (stdin/stdout piped). */
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'>
}

export function getKnowledgePath(configId: string): string {
  return resolvePathWithin(datastorePaths().knowledge, configId)
}

/** Stable attachment storage, deliberately outside directories rebuilt by the knowledge pipeline. */
export function getWorkspacesPath(configId: string): string {
  const workspacesRoot = resolvePathWithin(datastorePaths().root, 'workspaces')
  return resolvePathWithin(workspacesRoot, configId)
}

export function getConversationWorkspacePath(configId: string, convId: string): string {
  return resolvePathWithin(getWorkspacesPath(configId), assertCanonicalConversationId(convId))
}

export function getConversationUploadsPath(configId: string, convId: string): string {
  return resolvePathWithin(getConversationWorkspacePath(configId, convId), '_uploads')
}

function piLaunch(): { provider: '' | 'anthropic' | 'openai'; envArgs: string[] } {
  const { llmType, llmApiKey, llmBaseUrl } = readProviders()
  const provider =
    llmType === 'anthropic'
      ? 'anthropic'
      : llmType === 'openai' || llmType === 'openai-compatible'
        ? 'openai'
        : ''
  const envArgs: string[] = []
  if (provider === 'openai' && llmApiKey) {
    envArgs.push('-e', `OPENAI_API_KEY=${llmApiKey}`)
    if (llmBaseUrl) envArgs.push('-e', `OPENAI_BASE_URL=${llmBaseUrl}`)
  } else if (provider === 'anthropic' && llmApiKey) {
    envArgs.push('-e', `ANTHROPIC_API_KEY=${llmApiKey}`)
    if (llmBaseUrl) envArgs.push('-e', `ANTHROPIC_BASE_URL=${llmBaseUrl}`)
  }
  return { provider, envArgs }
}

/** Faster Pi RPC boot: skip extension/skill/template discovery and startup network I/O. */
const PI_LEAN_ARGS = ['--no-extensions', '-ns', '-np', '--no-themes', '--offline'] as const
const PI_TOOLS = 'read,bash,edit,write,grep,find,ls,ask_user'
const ASK_USER_EXTENSION_PATH = '/opt/pierre/extensions/ask-user.ts'
export const PI_SYSTEM_PROMPT_PATH = '/opt/pierre/PI_SYSTEM_APPEND.md'

export function buildPiCommand(
  name: string,
  input: {
    provider: '' | 'anthropic' | 'openai'
    envArgs: string[]
    model: string
  }
): string[] {
  return [
    'smolvm',
    'machine',
    'exec',
    '--name',
    name,
    '-i',
    '-w',
    '/work',
    ...input.envArgs,
    '--',
    'pi',
    '--mode',
    'rpc',
    '--no-session',
    ...(input.provider ? ['--provider', input.provider] : []),
    '--model',
    input.model,
    ...PI_LEAN_ARGS,
    '--tools',
    PI_TOOLS,
    '--append-system-prompt',
    PI_SYSTEM_PROMPT_PATH,
    '-e',
    ASK_USER_EXTENSION_PATH
  ]
}

function spawnPiProcess(name: string): Subprocess<'pipe', 'pipe', 'inherit'> {
  const { provider, envArgs } = piLaunch()
  const piProcess = Bun.spawn(buildPiCommand(name, { provider, envArgs, model: readAi().model }), {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'inherit'
  }) as Subprocess<'pipe', 'pipe', 'inherit'>

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
  workspacePath: string
): Promise<PierreInstance> {
  await $`mkdir -p ${workspacePath}`
  await withVmCreationSlot(async () => {
    await $`smolvm machine update --name ${name} -v ${knowledgePath}:/knowledge:ro -v ${workspacePath}:/work --net`
    await $`smolvm machine start --name ${name}`
  })

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] Pool VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, workspacePath, fromPool: true, piProcess }
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
  const workspacePath = getConversationWorkspacePath(configId, convId)
  const { cpus, memoryMiB } = vmResources()
  await $`mkdir -p ${workspacePath}`

  await withVmCreationSlot(async () => {
    await $`smolvm machine create --net --from ${getSmolmachinePath()} --volume ${knowledgePath}:/knowledge:ro --volume ${workspacePath}:/work --name ${name} --cpus ${cpus} --mem ${memoryMiB}`
    await $`smolvm machine start --name ${name}`
  })

  const piProcess = spawnPiProcess(name)
  console.log(`[SMOLVM] VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, workspacePath, fromPool: false, piProcess }
}

/**
 * Kills the Pi exec subprocess, then stops the smolVM.
 * Pool VMs are returned to the pool; others are deleted.
 */
export async function destroyPierreInstance(instance: PierreInstance): Promise<void> {
  instance.piProcess.kill()
  await withVmCreationSlot(async () => {
    await $`smolvm machine stop --name ${instance.name}`.nothrow().quiet()
    if (instance.fromPool) {
      await $`smolvm machine update --name ${instance.name} --remove-volume ${instance.knowledgePath}:/knowledge`
        .nothrow()
        .quiet()
      await $`smolvm machine update --name ${instance.name} --remove-volume ${instance.workspacePath}:/work`
        .nothrow()
        .quiet()
      return
    }
    await $`smolvm machine delete --name ${instance.name} -f`
  })
  if (instance.fromPool) returnPoolVm(instance.name)
}

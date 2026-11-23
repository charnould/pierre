import { $ } from 'bun'
import type { Subprocess } from 'bun'

import { assertCanonicalConversationId } from './ai-attachments'
import { datastorePaths, resolvePathWithin, SMOLVM_BIN } from './paths'
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

/** Default smolvm virtio-net host gateway (forwards to host 127.0.0.1; TSI blocks localhost). */
const PIERRE_HOST_GATEWAY = '100.96.0.1'

export function piLaunch(): { provider: '' | 'anthropic' | 'openai'; envArgs: string[] } {
  const { llmType, llmApiKey, llmBaseUrl } = readProviders()
  const provider =
    llmType === 'anthropic'
      ? 'anthropic'
      : llmType === 'openai' || llmType === 'openai-compatible'
        ? 'openai'
        : ''
  const port = Number(Bun.env['BUN_PORT'] ?? 3000) || 3000
  const envArgs: string[] = ['-e', `PIERRE_URL=http://${PIERRE_HOST_GATEWAY}:${port}`]
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
const PI_AUTOMATION_TOOLS = 'read,bash,grep,find,ls'
export const PI_PACKAGE_PATH = '/opt/pierre'
export const PI_SYSTEM_PROMPT_PATH = '/opt/pierre/PI_SYSTEM_APPEND.md'

export function buildPiCommand(
  name: string,
  input: {
    provider: '' | 'anthropic' | 'openai'
    envArgs: string[]
    model: string
    autonomous?: boolean
  }
): string[] {
  const autonomous = input.autonomous === true
  return [
    SMOLVM_BIN,
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
    autonomous ? PI_AUTOMATION_TOOLS : PI_TOOLS,
    '--append-system-prompt',
    PI_SYSTEM_PROMPT_PATH,
    '-e',
    PI_PACKAGE_PATH
  ]
}

function spawnPiProcess(name: string, autonomous = false): Subprocess<'pipe', 'pipe', 'inherit'> {
  const { provider, envArgs } = piLaunch()
  const piProcess = Bun.spawn(
    buildPiCommand(name, { provider, envArgs, model: readAi().model, autonomous }),
    {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'inherit'
    }
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
  workspacePath: string,
  autonomous = false
): Promise<PierreInstance> {
  await $`mkdir -p ${workspacePath}`
  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine update --name ${name} -v ${knowledgePath}:/knowledge:ro -v ${workspacePath}:/work --net`
    await $`${SMOLVM_BIN} machine start --name ${name}`
  })

  const piProcess = spawnPiProcess(name, autonomous)
  console.log(`[SMOLVM] Pool VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, workspacePath, fromPool: true, piProcess }
}

/**
 * Creates and starts a smolVM instance for a Pierre conversation (slow path).
 * Used when the VM pool is empty.
 */
export async function createPierreInstance(
  convId: string,
  configId: string,
  autonomous = false
): Promise<PierreInstance> {
  const name = convId
  const knowledgePath = getKnowledgePath(configId)
  const workspacePath = getConversationWorkspacePath(configId, convId)
  const { cpus, memoryMiB } = vmResources()
  await $`mkdir -p ${workspacePath}`

  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine create --net --net-backend virtio-net --from ${getSmolmachinePath()} --volume ${knowledgePath}:/knowledge:ro --volume ${workspacePath}:/work --name ${name} --cpus ${cpus} --mem ${memoryMiB}`
    await $`${SMOLVM_BIN} machine start --name ${name}`
  })

  const piProcess = spawnPiProcess(name, autonomous)
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
    await $`${SMOLVM_BIN} machine stop --name ${instance.name}`.nothrow().quiet()
    if (instance.fromPool) {
      await $`${SMOLVM_BIN} machine update --name ${instance.name} --remove-volume ${instance.knowledgePath}:/knowledge`
        .nothrow()
        .quiet()
      await $`${SMOLVM_BIN} machine update --name ${instance.name} --remove-volume ${instance.workspacePath}:/work`
        .nothrow()
        .quiet()
      return
    }
    await $`${SMOLVM_BIN} machine delete --name ${instance.name} -f`
  })
  if (instance.fromPool) returnPoolVm(instance.name)
}

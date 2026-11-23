import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync
} from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'

import type { Subprocess } from 'bun'
import { $ } from 'bun'

import { assertCanonicalConversationId } from './ai-attachments'
import { datastorePaths, resolvePathWithin, SMOLMACHINE_PATH, SMOLVM_BIN } from './paths'
import { PiRpcClient } from './pi-rpc'
import { type LlmType, type Providers, readAi, readProviders } from './providers'

export type VmSlotPriority = 'high' | 'low'

export type HotPoolVm = {
  name: string
  slotKnowledgePath: string
  slotWorkPath: string
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'> | null
  piClient: PiRpcClient | null
  providerFingerprint: string | null
  thinkingLevel: string | null
  detachWatcher: () => void
}

export type PierreInstance = {
  name: string
  knowledgePath: string
  workspacePath: string
  slotWorkPath?: string
  fromPool: boolean
  /** Long-lived exec subprocess that keeps Pi running inside the VM (stdin/stdout piped). */
  piProcess: Subprocess<'pipe', 'pipe', 'inherit'>
  /** Already-ready Pi RPC client returned by `activateHotPoolVm` (0 RPC on hot turn 1). */
  piClient?: PiRpcClient
  thinkingLevel: string
}

const DEFAULT_VM_CPUS = 2
const DEFAULT_VM_MEMORY_MIB = 512

/** Default smolvm virtio-net host gateway (forwards to host 127.0.0.1; TSI blocks localhost). */
const PIERRE_HOST_GATEWAY = '100.96.0.1'
const NODE_COMPILE_CACHE_PATH = '/opt/pierre/.node-cache'

/** Faster Pi RPC boot: skip extension/skill/template discovery and startup network I/O. */
const PI_LEAN_ARGS = ['--no-extensions', '-ns', '-np', '--no-themes', '--offline'] as const
const PI_TOOLS = 'read,bash,edit,write,grep,find,ls,ask_user'
const PI_AUTOMATION_TOOLS = 'read,bash,grep,find,ls'
export const PI_PACKAGE_PATH = '/opt/pierre'
export const PI_SYSTEM_PROMPT_PATH = '/opt/pierre/PI_SYSTEM_APPEND.md'

type QueuedSlotTask = {
  run: () => Promise<void>
}

const highQueue: QueuedSlotTask[] = []
const lowQueue: QueuedSlotTask[] = []
let slotRunning = false

function drainVmCreationSlot(): void {
  if (slotRunning) return
  const next = highQueue.shift() ?? lowQueue.shift()
  if (!next) return
  slotRunning = true
  void next.run().finally(() => {
    slotRunning = false
    drainVmCreationSlot()
  })
}

/**
 * Serializes `smolvm` machine lifecycle commands one at a time.
 * User-facing `high` tasks always run ahead of queued background `low` maintenance tasks.
 */
export function withVmCreationSlot<T>(
  task: () => Promise<T>,
  priority: VmSlotPriority = 'high'
): Promise<T> {
  return new Promise<T>((resolveTask, rejectTask) => {
    const entry: QueuedSlotTask = {
      run: async () => {
        try {
          resolveTask(await task())
        } catch (error) {
          rejectTask(error)
        }
      }
    }
    if (priority === 'high') highQueue.push(entry)
    else lowQueue.push(entry)
    drainVmCreationSlot()
  })
}

const positiveInteger = (name: string, fallback: number): number => {
  const raw = Bun.env[name] ?? String(fallback)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const vmResources = (): { cpus: number; memoryMiB: number } => ({
  cpus: positiveInteger('SMOLVM_CPUS', DEFAULT_VM_CPUS),
  memoryMiB: positiveInteger('SMOLVM_MEMORY_MIB', DEFAULT_VM_MEMORY_MIB)
})

export function getSmolmachinePath(): string {
  const smolmachinePath = resolve(SMOLMACHINE_PATH)
  if (!existsSync(smolmachinePath)) {
    throw new Error(
      `Smolmachine not found: ${smolmachinePath}. Run \`bun server:microvm:macos\` for local development.`
    )
  }
  return smolmachinePath
}

export function smolvmBlockIoArgs(): string[] {
  return process.platform === 'linux' ? ['--block-io', 'async'] : []
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

function piProvider(llmType: LlmType | ''): '' | 'anthropic' | 'openai' {
  if (llmType === 'anthropic') return 'anthropic'
  if (llmType === 'openai' || llmType === 'openai-compatible') return 'openai'
  return ''
}

function warmOrigin(provider: '' | 'anthropic' | 'openai', llmBaseUrl: string): string | null {
  if (llmBaseUrl) {
    try {
      return new URL(llmBaseUrl).origin
    } catch {
      // Fall through to provider default origin
    }
  }
  if (provider === 'anthropic') return 'https://api.anthropic.com'
  if (provider === 'openai') return 'https://api.openai.com'
  return null
}

export function piLaunch(providers: Providers = readProviders()): {
  provider: '' | 'anthropic' | 'openai'
  envArgs: string[]
} {
  const { llmType, llmApiKey, llmBaseUrl } = providers
  const provider = piProvider(llmType)
  const port = Number(Bun.env['BUN_PORT'] ?? 3000) || 3000
  const envArgs: string[] = [
    '-e',
    `NODE_COMPILE_CACHE=${NODE_COMPILE_CACHE_PATH}`,
    '-e',
    `PIERRE_URL=http://${PIERRE_HOST_GATEWAY}:${port}`
  ]
  const warmUrl = warmOrigin(provider, llmBaseUrl)
  if (warmUrl) envArgs.push('-e', `PIERRE_WARM_URL=${warmUrl}`)
  if (provider === 'openai' && llmApiKey) {
    envArgs.push('-e', `OPENAI_API_KEY=${llmApiKey}`)
    if (llmBaseUrl) envArgs.push('-e', `OPENAI_BASE_URL=${llmBaseUrl}`)
  } else if (provider === 'anthropic' && llmApiKey) {
    envArgs.push('-e', `ANTHROPIC_API_KEY=${llmApiKey}`)
    if (llmBaseUrl) envArgs.push('-e', `ANTHROPIC_BASE_URL=${llmBaseUrl}`)
  }
  return { provider, envArgs }
}

/**
 * Computes a 16-char SHA-256 fingerprint of the active LLM provider configuration.
 * Never exposes the raw API key. Returns `null` when no provider/model is configured.
 */
export function providerFingerprint(providers: Providers = readProviders()): string | null {
  const provider = piProvider(providers.llmType)
  const model = providers.llmModel.trim()
  if (!provider || !model) return null
  const effort = readAi(providers).effort
  return new Bun.CryptoHasher('sha256')
    .update(`${provider}|${providers.llmBaseUrl}|${model}|${effort}|${providers.llmApiKey}`)
    .digest('hex')
    .slice(0, 16)
}

export function buildPiCommand(
  name: string,
  input: {
    provider: '' | 'anthropic' | 'openai'
    envArgs: string[]
    model: string
    thinking?: string
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
    ...(input.thinking ? ['--thinking', input.thinking] : []),
    ...PI_LEAN_ARGS,
    '--tools',
    autonomous ? PI_AUTOMATION_TOOLS : PI_TOOLS,
    '--append-system-prompt',
    PI_SYSTEM_PROMPT_PATH,
    '-e',
    PI_PACKAGE_PATH
  ]
}

export function spawnPiProcess(
  name: string,
  autonomous = false
): Subprocess<'pipe', 'pipe', 'inherit'> {
  const { provider, envArgs } = piLaunch()
  const ai = readAi()
  const piProcess = Bun.spawn(
    buildPiCommand(name, {
      provider,
      envArgs,
      model: ai.model,
      thinking: ai.effort,
      autonomous
    }),
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

function isWithinCanonicalRoot(canonicalRoot: string, candidate: string): boolean {
  const rel = relative(canonicalRoot, candidate)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function linkOrCopyFile(sourceFile: string, targetFile: string): void {
  if (existsSync(targetFile)) return
  try {
    linkSync(sourceFile, targetFile)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'EEXIST') return
    if (code === 'EXDEV') {
      copyFileSync(sourceFile, targetFile)
      return
    }
    throw error
  }
}

/**
 * Incrementally hardlinks files from `sourceDir` into `targetDir` (falling back to copy on EXDEV).
 * Ignores symlinks that escape `sourceDir` and preserves existing files/inodes in `targetDir`.
 */
export function syncDirectoryToSlot(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) return
  const canonicalSource = realpathSync(sourceDir)
  const resolvedTarget = resolve(targetDir)
  mkdirSync(resolvedTarget, { recursive: true })

  const visited = new Set<string>([canonicalSource])

  const walk = (currentSource: string, currentTarget: string): void => {
    for (const entry of readdirSync(currentSource, { withFileTypes: true })) {
      const srcPath = resolvePathWithin(currentSource, entry.name)
      const dstPath = resolvePathWithin(currentTarget, entry.name)

      if (entry.isSymbolicLink()) {
        let realTarget: string
        try {
          realTarget = realpathSync(srcPath)
        } catch {
          continue
        }
        if (!isWithinCanonicalRoot(canonicalSource, realTarget)) continue
        let targetStat
        try {
          targetStat = statSync(realTarget)
        } catch {
          continue
        }
        if (targetStat.isDirectory()) {
          if (visited.has(realTarget)) continue
          visited.add(realTarget)
          mkdirSync(dstPath, { recursive: true })
          walk(realTarget, dstPath)
        } else if (targetStat.isFile()) {
          linkOrCopyFile(realTarget, dstPath)
        }
        continue
      }

      if (entry.isDirectory()) {
        mkdirSync(dstPath, { recursive: true })
        walk(srcPath, dstPath)
      } else if (entry.isFile()) {
        linkOrCopyFile(srcPath, dstPath)
      }
    }
  }

  walk(canonicalSource, resolvedTarget)
}

/**
 * Removes all direct children of `dir` without removing `dir` itself so virtiofs mountpoint inodes stay intact.
 */
export function emptyDirectory(dir: string): void {
  const resolved = resolve(dir)
  if (!existsSync(resolved)) {
    mkdirSync(resolved, { recursive: true })
    return
  }
  for (const entry of readdirSync(resolved)) {
    rmSync(resolvePathWithin(resolved, entry), { recursive: true, force: true })
  }
}

/**
 * Attaches a conversation's knowledge and workspace files to a pre-booted hot pool VM.
 * Reuses the already-running Pi RPC client on hot hits (0 RPC before the first prompt).
 */
export async function activateHotPoolVm(
  slot: HotPoolVm,
  knowledgePath: string,
  workspacePath: string,
  autonomous = false
): Promise<PierreInstance> {
  syncDirectoryToSlot(knowledgePath, slot.slotKnowledgePath)
  syncDirectoryToSlot(workspacePath, slot.slotWorkPath)

  const currentFp = providerFingerprint()
  if (
    !autonomous &&
    slot.piClient &&
    slot.piProcess &&
    currentFp !== null &&
    slot.providerFingerprint === currentFp
  ) {
    return {
      name: slot.name,
      knowledgePath,
      workspacePath,
      slotWorkPath: slot.slotWorkPath,
      fromPool: true,
      piProcess: slot.piProcess,
      piClient: slot.piClient,
      thinkingLevel: slot.thinkingLevel ?? readAi().effort
    }
  }

  slot.piClient?.dispose()
  try {
    slot.piProcess?.kill()
  } catch {}

  const thinkingLevel = readAi().effort
  const piProcess = spawnPiProcess(slot.name, autonomous)
  const piClient = new PiRpcClient(piProcess)
  try {
    await piClient.waitForReady()
  } catch (error) {
    piClient.dispose()
    try {
      piProcess.kill()
    } catch {}
    throw error
  }

  console.log(
    `[SMOLVM] Hot pool VM ${slot.name} activated with fresh Pi (autonomous=${autonomous})`
  )
  return {
    name: slot.name,
    knowledgePath,
    workspacePath,
    slotWorkPath: slot.slotWorkPath,
    fromPool: true,
    piProcess,
    piClient,
    thinkingLevel
  }
}

/**
 * Creates and starts a smolVM instance for a Pierre conversation (slow fallback path).
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
  mkdirSync(workspacePath, { recursive: true })

  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine create --net --net-backend virtio-net ${smolvmBlockIoArgs()} --from ${getSmolmachinePath()} --volume ${knowledgePath}:/knowledge:ro --volume ${workspacePath}:/work --name ${name} --cpus ${cpus} --mem ${memoryMiB}`
    await $`${SMOLVM_BIN} machine start --name ${name}`
  }, 'high')

  const thinkingLevel = readAi().effort
  const piProcess = spawnPiProcess(name, autonomous)
  console.log(`[SMOLVM] VM ${name} ready — Pi RPC subprocess started`)
  return { name, knowledgePath, workspacePath, fromPool: false, piProcess, thinkingLevel }
}

/** Stops and deletes a non-pool conversation VM in background priority. */
export async function destroyColdMachine(name: string): Promise<void> {
  await withVmCreationSlot(async () => {
    await $`${SMOLVM_BIN} machine stop --name ${name}`.nothrow().quiet()
    await $`${SMOLVM_BIN} machine delete --name ${name} -f`.nothrow().quiet()
  }, 'low')
}

/**
 * Pi agent integration for PIERRE
 *
 * Manages per-conversation Pi sessions backed by isolated smolVMs.
 * Each conversation (`convId`) gets its own VM where Pi runs in RPC mode
 * (stdin/stdout JSONL). System instructions are written to the conversation
 * workspace before VM creation so Pi reads them without mutating shared knowledge.
 *
 * VM lifecycle is managed by `vm-registry.ts` (10 min inactivity timeout).
 *
 * Pi works in `/work`; profile knowledge is mounted read-only at `/knowledge`.
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import {
  type AiStreamEvent,
  type AiStreamMessage,
  type AskUserQuestion,
  dropTextBeforeLastTool
} from '../../shared/ai-stream-events'
import type {
  LlmCompactionRecord,
  LlmOperation,
  LlmRunStatus,
  LlmToolRecord
} from '../../shared/llm-usage'
import { isPromptId } from '../../shared/prompts'
import type { PiImageContent } from './ai-attachments'
import { chatbotInstructions } from './chatbot-config'
import { neutralError, parseSessionCounters, recordLlmRun, type SessionCounters } from './llm-runs'
import { datastorePaths } from './paths'
import { readAi } from './providers'
import { skillPrompt, timezone } from './setup-store'
import { getConversationWorkspacePath } from './smolvm'
import { today_is } from './today-is'
import {
  acquireVm,
  cancelPendingUiRequest,
  hasVm,
  registerPendingUiRequest,
  releaseVm
} from './vm-registry'
import type { WorkflowPayload } from './workflow-payload'

const configuredGenerationTimeout = Number(Bun.env['LLM_GENERATION_TIMEOUT_MS'] ?? 600_000)
export const LLM_GENERATION_TIMEOUT_MS = Number.isFinite(configuredGenerationTimeout)
  ? Math.min(30 * 60 * 1000, Math.max(30_000, configuredGenerationTimeout))
  : 600_000

// Stable project root anchored to this file's location (utils/ → ../)
const knowledgePathOnHost = (configId: string): string => {
  const p = join(datastorePaths().knowledge, configId)
  if (!existsSync(p)) {
    throw new Error(`[AGENT] Knowledge directory not found: ${p}`)
  }
  return p
}

// ---------------------------------------------------------------------------
// Per-conversation lock (prevents concurrent turns on the same session)
// ---------------------------------------------------------------------------

const locks = new Map<string, Promise<void>>()

// ---------------------------------------------------------------------------
// AGENTS.md builder — system instructions for Pi
// ---------------------------------------------------------------------------

/**
 * Writes an AGENTS.md file into the knowledge directory on the host.
 * Pi reads this file from its working directory (`/knowledge`) at startup.
 * Content: current date + AGENTS.md sections + SQLite schema.
 */
const AUTOMATION_PROMPT_SLOT = '<!-- AUTOMATION_PROMPT_HERE -->'

/** Replaces the slot. Does not insert the slot when the consigne has none. */
export function insertAutomationPrompt(markdown: string, prompt: string | undefined): string {
  if (prompt === undefined || !markdown.includes(AUTOMATION_PROMPT_SLOT)) return markdown
  return markdown.replace(AUTOMATION_PROMPT_SLOT, prompt)
}

export async function buildConversationAgentsFile(
  convId: string,
  configId: string,
  workflowPayload?: WorkflowPayload,
  automationPrompt?: string
): Promise<void> {
  const knowledgePath = knowledgePathOnHost(configId)
  const workspacePath = getConversationWorkspacePath(configId, convId)
  const dbPath = join(knowledgePath, 'db.sqlite')

  const parts: string[] = [
    `<session>Current date and time (${timezone() ?? 'UTC'}): ${today_is()}</session>.`
  ]

  let raw = (
    isPromptId(configId) ? (skillPrompt(configId) ?? '') : chatbotInstructions(configId)
  ).trim()

  if (raw) {
    if (raw.includes('<!-- KNOWLEDGE_SCHEMA_HERE -->') && (await Bun.file(dbPath).exists())) {
      try {
        using db = new Database(dbPath, { readonly: true })
        const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
        raw = raw.replace('<!-- KNOWLEDGE_SCHEMA_HERE -->', row?.content?.trim() ?? '')
      } catch (err) {
        console.warn('[AGENT] Could not read db schema:', err)
      }
    }

    if (workflowPayload && raw.includes('<!-- WORKFLOW_PAYLOAD_HERE -->')) {
      const compact = Object.fromEntries(
        Object.entries(workflowPayload as Record<string, unknown>).filter(
          ([, v]) => v !== null && v !== undefined && v !== ''
        )
      )
      raw = raw.replace('<!-- WORKFLOW_PAYLOAD_HERE -->', JSON.stringify(compact, null, 2))
    }

    raw = insertAutomationPrompt(raw, automationPrompt)

    if (raw) parts.push(raw)
  }

  mkdirSync(workspacePath, { recursive: true })
  await Bun.write(join(workspacePath, 'AGENTS.md'), parts.join('\n\n'))
  console.log(`[AGENT] AGENTS.md written (${parts.length} sections)`)
}

// ---------------------------------------------------------------------------
// Streaming API
// ---------------------------------------------------------------------------

export type CopilotChunk =
  | Exclude<AiStreamEvent, { type: 'stream_end' } | { type: 'error' }>
  | { type: 'done'; fullContent: string }

const ASK_USER_MARKER = 'pierre:ask_user:'

export function parseAskUserMarker(title: unknown): string | null {
  if (typeof title !== 'string' || !title.startsWith(ASK_USER_MARKER)) return null
  try {
    const marker = JSON.parse(title.slice(ASK_USER_MARKER.length)) as Record<string, unknown>
    return typeof marker['toolCallId'] === 'string' && marker['toolCallId']
      ? marker['toolCallId']
      : null
  } catch {
    return null
  }
}

function isAskUserQuestions(value: unknown): value is AskUserQuestion[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>)['question'] === 'string' &&
        Array.isArray((item as Record<string, unknown>)['choices']) &&
        ((item as Record<string, unknown>)['choices'] as unknown[]).length === 3 &&
        ((item as Record<string, unknown>)['choices'] as unknown[]).every(
          (choice) => typeof choice === 'string'
        )
    )
  )
}

function messageText(message: AiStreamMessage): string {
  return dropTextBeforeLastTool(message.content)
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

export function toolExecutionDuration(
  event: Record<string, unknown>,
  startedAt: number | undefined,
  now = Date.now()
): number {
  const native = event['durationMs']
  if (typeof native === 'number' && Number.isFinite(native)) return Math.max(0, native)
  return startedAt === undefined ? 0 : Math.max(0, now - startedAt)
}

export function resolveAgentSettlement(
  event: Record<string, unknown>,
  assistantError: Error | null,
  generationTimedOut: boolean
): { status: LlmRunStatus; error: Error | null } {
  if (event['aborted'] === true) {
    return {
      status: generationTimedOut ? 'timeout' : 'aborted',
      error: new DOMException('Request aborted', 'AbortError')
    }
  }
  if (assistantError) return { status: 'error', error: assistantError }
  return { status: 'success', error: null }
}

/** Maps display-relevant Pi RPC events without forwarding cumulative partial messages. */
export function piEventToCopilotChunks(event: Record<string, unknown>): CopilotChunk[] {
  const type = event['type']
  if (type === 'message_update') {
    const update = event['assistantMessageEvent']
    if (!update || typeof update !== 'object') return []
    const ae = update as Record<string, unknown>
    const contentIndex = ae['contentIndex']
    if (typeof contentIndex !== 'number') return []

    switch (ae['type']) {
      case 'text_start':
        return [{ type: 'text_start', contentIndex }]
      case 'text_delta':
        return typeof ae['delta'] === 'string'
          ? [{ type: 'text_delta', contentIndex, delta: ae['delta'] }]
          : []
      case 'text_end':
        return typeof ae['content'] === 'string'
          ? [{ type: 'text_end', contentIndex, content: ae['content'] }]
          : []
      case 'thinking_start':
        return [{ type: 'thinking_start', contentIndex }]
      case 'thinking_delta':
        return typeof ae['delta'] === 'string'
          ? [{ type: 'thinking_delta', contentIndex, delta: ae['delta'] }]
          : []
      case 'thinking_end':
        return typeof ae['content'] === 'string'
          ? [{ type: 'thinking_end', contentIndex, content: ae['content'] }]
          : []
      case 'toolcall_start':
        return typeof ae['id'] === 'string' && typeof ae['toolName'] === 'string'
          ? [
              {
                type: 'toolcall_start',
                contentIndex,
                toolCallId: ae['id'],
                toolName: ae['toolName']
              }
            ]
          : []
      case 'toolcall_delta':
        return typeof ae['delta'] === 'string'
          ? [{ type: 'toolcall_delta', contentIndex, delta: ae['delta'] }]
          : []
      case 'toolcall_end': {
        const toolCall = ae['toolCall']
        if (!toolCall || typeof toolCall !== 'object') return []
        return [
          {
            type: 'toolcall_end',
            contentIndex,
            toolCall: toolCall as {
              type: 'toolCall'
              id: string
              name: string
              arguments: unknown
            }
          }
        ]
      }
      default:
        return []
    }
  }

  if (type === 'message_end') {
    const message = event['message']
    if (!message || typeof message !== 'object') return []
    const assistantMessage = message as Record<string, unknown>
    return assistantMessage['role'] === 'assistant' && Array.isArray(assistantMessage['content'])
      ? [{ type: 'message_end', message: message as AiStreamMessage }]
      : []
  }

  if (type === 'tool_execution_start') {
    return typeof event['toolCallId'] === 'string' && typeof event['toolName'] === 'string'
      ? [
          {
            type,
            toolCallId: event['toolCallId'],
            toolName: event['toolName'],
            args: event['args']
          }
        ]
      : []
  }

  if (type === 'tool_execution_update') {
    return typeof event['toolCallId'] === 'string' && typeof event['toolName'] === 'string'
      ? [
          {
            type,
            toolCallId: event['toolCallId'],
            toolName: event['toolName'],
            args: event['args'],
            partialResult: event['partialResult']
          }
        ]
      : []
  }

  if (type === 'tool_execution_end') {
    return typeof event['toolCallId'] === 'string' && typeof event['toolName'] === 'string'
      ? [
          {
            type,
            toolCallId: event['toolCallId'],
            toolName: event['toolName'],
            result: event['result'],
            isError: event['isError'] === true
          }
        ]
      : []
  }

  return []
}

/**
 * Stream a response from Pi as incremental chunks.
 *
 * Yields:
 * Yields structured message/tool lifecycle events plus an internal `done`
 * record carrying persistence and telemetry metadata.
 *
 * Each conversation (`convId`) runs in its own smolVM. The VM is created on
 * the first call and reused for subsequent messages of the same conversation.
 */
export async function* streamCopilot(
  convId: string,
  configId: string,
  prompt: string,
  model = readAi().model,
  signal?: AbortSignal,
  images?: PiImageContent[],
  reasoningEffort = readAi().effort,
  options?: {
    workflowPayload?: WorkflowPayload
    automationPrompt?: string
    onVmAcquired?: () => void
    usage?: {
      operation: LlmOperation
      userEmail?: string | null
      automationId?: string | null
    }
  }
): AsyncGenerator<CopilotChunk> {
  const t0 = Date.now()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[AGENT] New request`)
  console.log(`[AGENT]   conv_id  : ${convId}`)
  console.log(`[AGENT]   config   : ${configId}`)
  console.log(`[AGENT]   model    : ${model}`)
  if (Bun.env['DEBUG'] === 'true' && Bun.env['NODE_ENV'] !== 'production') {
    console.log(`[AGENT]   prompt   : "${prompt}"`)
  }
  if (images?.length) {
    const totalKb = Math.round(images.reduce((sum, image) => sum + image.data.length, 0) / 1024)
    console.log(`[AGENT]   images   : ${images.length} (~${totalKb} KiB base64)`)
  }
  console.log(`${'='.repeat(60)}`)

  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')

  const prev = locks.get(convId) ?? Promise.resolve()
  let releaseLock!: () => void
  const lockNext = new Promise<void>((r) => {
    releaseLock = r
  })
  locks.set(convId, lockNext)
  await prev

  const startedAt = new Date()
  const provider = readAi().type
  let piClient: Awaited<ReturnType<typeof acquireVm>>['piClient'] | undefined
  let before: SessionCounters | null = null
  let after: SessionCounters | null = null
  let runStatus: LlmRunStatus = 'error'
  let runError: string | null = null
  let settled = false
  const tools: LlmToolRecord[] = []
  const responseModels = new Set<string>()
  const compactions: LlmCompactionRecord[] = []
  let pendingCompactionIndex: number | null = null
  let reasoningContent = ''
  let providerCost = 0
  let hasProviderCost = false
  let retryCount = 0
  const toolStarts = new Map<string, { name: string; args: unknown; at: number }>()
  const settle = (status: LlmRunStatus, error?: unknown) => {
    if (settled) return
    settled = true
    runStatus = status
    runError = neutralError(error)
  }

  try {
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    // Step 1 — Get (or create) the VM and Pi RPC client for this conversation
    console.log(`[AGENT] Step 1/2 — Getting VM...`)
    const t1 = Date.now()
    // Refresh AGENTS.md with the current date/time before creating a new VM
    if (!hasVm(convId)) {
      await buildConversationAgentsFile(
        convId,
        configId,
        options?.workflowPayload,
        options?.automationPrompt
      )
    }
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    const acquired = await acquireVm(convId, configId)
    const client = acquired.piClient
    piClient = client
    options?.onVmAcquired?.()
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    console.log(`[AGENT] Step 1/2 — VM ready (${Date.now() - t1}ms)`)

    // Set reasoning effort before sending the prompt
    try {
      await client.sendCommand({ type: 'set_thinking_level', level: reasoningEffort }, 3_000)
    } catch {
      // Non-fatal: some providers/models ignore thinking level
    }

    // Queue to bridge event callbacks → async generator
    const queue: CopilotChunk[] = []
    let notifyConsumer: (() => void) | null = null
    let streamDone = false
    let streamError: Error | null = null
    let finalizing = false

    function enqueue(chunk: CopilotChunk) {
      queue.push(chunk)
      notifyConsumer?.()
      notifyConsumer = null
    }
    function endStream() {
      streamDone = true
      notifyConsumer?.()
      notifyConsumer = null
    }
    function failStream(err: Error) {
      streamError = err
      notifyConsumer?.()
      notifyConsumer = null
    }

    let finalContent = ''
    let assistantError: Error | null = null
    let toolCount = 0
    const askUserQuestions = new Map<string, AskUserQuestion[]>()

    const generationTimeoutMs = LLM_GENERATION_TIMEOUT_MS
    let timeoutRemainingMs = generationTimeoutMs
    let timeoutStartedAt = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let generationTimedOut = false

    const armGenerationTimeout = () => {
      timeoutStartedAt = Date.now()
      timeoutId = setTimeout(() => {
        timeoutId = null
        generationTimedOut = true
        cancelPendingUiRequest(convId)
        client.sendRaw({ type: 'abort' })
        if (!streamDone) {
          const error = new Error(`Timeout: no response within ${generationTimeoutMs / 1000}s`)
          settle('timeout', error)
          failStream(error)
        }
      }, timeoutRemainingMs)
    }
    const pauseGenerationTimeout = () => {
      if (!timeoutId) return
      clearTimeout(timeoutId)
      timeoutId = null
      timeoutRemainingMs = Math.max(0, timeoutRemainingMs - (Date.now() - timeoutStartedAt))
    }
    const resumeGenerationTimeout = () => {
      if (timeoutId || streamDone || generationTimedOut) return
      armGenerationTimeout()
    }

    const s = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

    const unsubscribe = client.onEvent((event) => {
      const type = event['type'] as string

      if (type === 'message_update') {
        const ae = event['assistantMessageEvent'] as Record<string, unknown> | undefined
        if (ae?.['type'] === 'thinking_delta' && typeof ae['delta'] === 'string') {
          reasoningContent += ae['delta']
        }
      } else if (type === 'message_end') {
        const message = event['message'] as AiStreamMessage | undefined
        if (message?.role === 'assistant') {
          const diagnosticMessage = message as unknown as Record<string, unknown>
          const stopReason = diagnosticMessage['stopReason']
          if (stopReason === 'error' || stopReason === 'length') {
            assistantError = new Error(
              typeof diagnosticMessage['errorMessage'] === 'string'
                ? diagnosticMessage['errorMessage']
                : stopReason === 'length'
                  ? 'Pi assistant response exceeded the context window'
                  : 'Pi assistant response failed'
            )
          } else if (stopReason !== 'pending') {
            assistantError = null
          }
          const responseModel =
            typeof diagnosticMessage['responseModel'] === 'string'
              ? diagnosticMessage['responseModel']
              : typeof diagnosticMessage['model'] === 'string'
                ? diagnosticMessage['model']
                : null
          if (responseModel) responseModels.add(responseModel)
          const usage =
            diagnosticMessage['usage'] && typeof diagnosticMessage['usage'] === 'object'
              ? (diagnosticMessage['usage'] as Record<string, unknown>)
              : null
          const cost =
            usage?.['cost'] && typeof usage['cost'] === 'object'
              ? (usage['cost'] as Record<string, unknown>)
              : null
          if (
            cost?.['totalFromProvider'] === true &&
            typeof cost['total'] === 'number' &&
            Number.isFinite(cost['total'])
          ) {
            providerCost += cost['total']
            hasProviderCost = true
          }
        }
        if (message?.role === 'assistant' && Array.isArray(message.content)) {
          finalContent = messageText(message)
        }
      }

      for (const chunk of piEventToCopilotChunks(event)) enqueue(chunk)

      switch (type) {
        case 'agent_start':
          console.log(`[AGENT]   ▶ Agent started (${s()})`)
          break

        case 'tool_execution_start': {
          toolCount++
          const toolName = event['toolName'] as string
          const toolCallId = event['toolCallId'] as string | undefined
          const args = event['args'] as Record<string, unknown> | undefined
          if (toolCallId)
            toolStarts.set(toolCallId, { name: toolName, args: args ?? null, at: Date.now() })
          if (toolName === 'ask_user' && toolCallId && isAskUserQuestions(args?.['questions'])) {
            askUserQuestions.set(toolCallId, args['questions'])
          }
          console.log(`[AGENT]   ↳ Tool #${toolCount} start: ${toolName} (${s()})`)
          break
        }

        case 'tool_execution_end': {
          const toolName = event['toolName'] as string
          const toolCallId = event['toolCallId'] as string | undefined
          const isError = event['isError'] as boolean | undefined
          const started = toolCallId ? toolStarts.get(toolCallId) : undefined
          const toolMs = toolExecutionDuration(event, started?.at)
          if (toolCallId) toolStarts.delete(toolCallId)
          tools.push({
            name: toolName,
            args: started?.args ?? null,
            result: event['result'] ?? null,
            durationMs: toolMs,
            status: isError ? 'error' : 'ok'
          })
          if (toolCallId) askUserQuestions.delete(toolCallId)
          console.log(
            `[AGENT]   ↳ Tool done: ${toolName} (${toolMs}ms, ${s()})${isError ? ' [error]' : ''}`
          )
          break
        }

        case 'extension_ui_request': {
          if (event['method'] !== 'input' || typeof event['id'] !== 'string') {
            break
          }

          const toolCallId = parseAskUserMarker(event['title'])
          const questions = toolCallId ? askUserQuestions.get(toolCallId) : undefined
          if (!toolCallId || !questions) {
            client.sendRaw({
              type: 'extension_ui_response',
              id: event['id'],
              cancelled: true
            })
            break
          }

          const responseSecret = crypto
            .getRandomValues(new Uint8Array(32))
            .toBase64({ alphabet: 'base64url', omitPadding: true })
          const registered = registerPendingUiRequest(
            convId,
            { requestId: event['id'], toolCallId, responseSecret },
            resumeGenerationTimeout
          )
          if (!registered) {
            client.sendRaw({
              type: 'extension_ui_response',
              id: event['id'],
              cancelled: true
            })
            break
          }

          pauseGenerationTimeout()
          enqueue({
            type: 'extension_ui_request',
            requestId: event['id'],
            toolCallId,
            method: 'input',
            responseSecret,
            questions
          })
          break
        }

        case 'agent_end':
          console.log(
            `[AGENT]   ■ Agent run ended (${s()})${event['willRetry'] === true ? ' — recovery pending' : ''}`
          )
          break

        case 'agent_settled': {
          if (streamDone || streamError || finalizing) break
          finalizing = true
          const outcome = resolveAgentSettlement(event, assistantError, generationTimedOut)
          if (outcome.error) {
            settle(outcome.status, outcome.error)
            failStream(outcome.error)
            break
          }
          client
            .sendCommand<Record<string, unknown>>({ type: 'get_session_stats' }, 10_000)
            .then((statsResp) => {
              after = parseSessionCounters(statsResp['data'])
              settle('success')
              enqueue({ type: 'done', fullContent: finalContent })
              endStream()
            })
            .catch((err) => {
              console.warn('[AGENT] Failed to fetch final stats:', err)
              settle('success')
              enqueue({ type: 'done', fullContent: finalContent })
              endStream()
            })
          break
        }

        case 'auto_retry_start':
          retryCount++
          console.log(`[AGENT]   ↻ Provider retry started (${s()})`)
          break

        case 'auto_retry_end': {
          if (!(event['success'] as boolean)) {
            const errMsg = (event['finalError'] as string | undefined) ?? 'Max retries exceeded'
            console.error(`[AGENT]   ❌ Auto-retry failed (${s()}): ${errMsg}`)
            assistantError = new Error(errMsg)
          }
          break
        }

        case 'compaction_start': {
          const rawReason = event['reason']
          const reason =
            rawReason === 'manual' || rawReason === 'threshold' || rawReason === 'overflow'
              ? rawReason
              : 'unknown'
          compactions.push({
            reason,
            status: 'error',
            tokensBefore: null,
            estimatedTokensAfter: null,
            error: 'Compaction did not finish'
          })
          pendingCompactionIndex = compactions.length - 1
          console.log(`[AGENT]   ↧ Compaction ${reason} started (${s()})`)
          break
        }

        case 'compaction_end': {
          const result =
            event['result'] && typeof event['result'] === 'object'
              ? (event['result'] as Record<string, unknown>)
              : null
          const rawReason = event['reason']
          const reason =
            rawReason === 'manual' || rawReason === 'threshold' || rawReason === 'overflow'
              ? rawReason
              : 'unknown'
          const aborted = event['aborted'] === true
          const error =
            typeof event['errorMessage'] === 'string' ? neutralError(event['errorMessage']) : null
          const record: LlmCompactionRecord = {
            reason,
            status: aborted ? 'aborted' : result ? 'success' : 'error',
            tokensBefore:
              result && typeof result['tokensBefore'] === 'number' ? result['tokensBefore'] : null,
            estimatedTokensAfter:
              result && typeof result['estimatedTokensAfter'] === 'number'
                ? result['estimatedTokensAfter']
                : null,
            error
          }
          if (pendingCompactionIndex == null) compactions.push(record)
          else compactions[pendingCompactionIndex] = record
          pendingCompactionIndex = null
          console.log(`[AGENT]   ↧ Compaction ${reason} finished (${s()})`)
          break
        }

        case 'extension_error':
          console.error(`[AGENT]   ❌ Extension error (${s()}):`, event['error'])
          break
      }
    })
    const unsubscribeClose = client.onClose(() => {
      if (streamDone || streamError) return
      const error = new Error('Pi process closed unexpectedly')
      settle('error', error)
      failStream(error)
    })

    // Wire abort signal
    const abortHandler = () => {
      console.log('[AGENT] ⚠ Abort signal received — aborting Pi session')
      cancelPendingUiRequest(convId)
      client.sendRaw({ type: 'abort' })
      setTimeout(() => {
        if (!streamDone) {
          const error = new DOMException('Request aborted', 'AbortError')
          settle('aborted', error)
          failStream(error)
        }
      }, 5_000)
    }
    signal?.addEventListener('abort', abortHandler, { once: true })

    // Safety timeout counts generation time only; it is paused during native Pi UI input.
    armGenerationTimeout()

    try {
      const initial = await client.sendCommand<Record<string, unknown>>(
        { type: 'get_session_stats' },
        10_000
      )
      before = parseSessionCounters(initial['data'])
    } catch (err) {
      console.warn('[AGENT] Failed to fetch initial stats:', err)
    }

    // Step 2 — Send prompt (Pi acks immediately, then streams events)
    console.log(`[AGENT] Step 2/2 — Sending prompt...`)
    const t3 = Date.now()
    await client.sendCommand(
      {
        type: 'prompt',
        message: prompt,
        ...(images?.length ? { images } : {})
      },
      10_000
    )
    console.log(`[AGENT] Step 2/2 — Prompt accepted (${Date.now() - t3}ms), streaming events...`)

    // Consume queue — yield chunks to the caller
    try {
      while (true) {
        if (queue.length === 0 && !streamDone && !streamError) {
          await new Promise<void>((r) => {
            notifyConsumer = r
          })
        }
        while (queue.length > 0) {
          yield queue.shift()!
        }
        if (streamError) throw streamError
        if (streamDone) break
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      if (!streamDone) cancelPendingUiRequest(convId)
      signal?.removeEventListener('abort', abortHandler)
      unsubscribe()
      unsubscribeClose()
    }

    console.log(`[AGENT] ✅ Complete (total: ${Date.now() - t0}ms, tools: ${toolCount})`)
  } catch (err) {
    if (signal?.aborted) settle('aborted', err)
    else settle('error', err)
    throw err
  } finally {
    if (options?.usage) {
      try {
        if (piClient && !after) {
          const stats = await piClient.sendCommand<Record<string, unknown>>(
            { type: 'get_session_stats' },
            10_000
          )
          after = parseSessionCounters(stats['data'])
        }
      } catch (err) {
        console.warn('[AGENT] Failed to fetch closing stats:', err)
      }
      try {
        recordLlmRun({
          operation: options.usage.operation,
          status: runStatus,
          startedAt: startedAt.toISOString(),
          durationMs: Date.now() - startedAt.getTime(),
          convId,
          configId,
          userEmail: options.usage.userEmail ?? null,
          automationId: options.usage.automationId ?? null,
          provider,
          model,
          responseModels: [...responseModels],
          reasoningEffort,
          before,
          after,
          reasoning: reasoningContent,
          error: runError,
          tools,
          providerCost: hasProviderCost ? providerCost : null,
          retryCount,
          compactions
        })
      } catch (err) {
        console.warn('[AGENT] Failed to record LLM run:', err)
      }
    }
    releaseLock()
    if (locks.get(convId) === lockNext) locks.delete(convId)
    releaseVm(convId)
  }
}

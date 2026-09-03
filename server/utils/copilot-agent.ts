/**
 * Pi agent integration for PIERRE
 *
 * Manages per-conversation Pi sessions backed by isolated smolVMs.
 * Each conversation (`convId`) gets its own VM where Pi runs in RPC mode
 * (stdin/stdout JSONL). System instructions are written to AGENTS.md in the
 * knowledge directory before VM creation so Pi reads them at startup.
 *
 * VM lifecycle is managed by `vm-registry.ts` (30 min inactivity timeout).
 *
 * The agent's working directory inside the VM is `/knowledge`, where the
 * config's knowledge folder is mounted read-write.
 */

import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { AiStreamEvent, AiStreamMessage, AskUserQuestion } from '../../shared/ai-stream-events'
import type { PiImageContent } from './ai-attachments'
import { CUSTOMIZATION_DIR, datastorePaths } from './paths'
import { today_is } from './today-is'
import {
  acquireVm,
  cancelPendingUiRequest,
  hasVm,
  registerPendingUiRequest,
  releaseVm
} from './vm-registry'
import type { WorkflowPayload } from './workflow-payload'

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
async function buildAgentsFile(configId: string, workflowPayload?: WorkflowPayload): Promise<void> {
  const knowledgePath = knowledgePathOnHost(configId)
  const skillDir = join(CUSTOMIZATION_DIR, 'skills', configId)
  const isSkill = existsSync(skillDir)
  const instructionsPath = join(
    CUSTOMIZATION_DIR,
    isSkill ? 'skills' : 'chatbots',
    configId,
    'AGENTS.md'
  )

  const parts: string[] = [
    `<session>Current date and time (Europe/Paris): ${today_is()}</session>.`
  ]

  if (await Bun.file(instructionsPath).exists()) {
    let raw = (await Bun.file(instructionsPath).text()).trim()

    const dbPath = join(knowledgePath, 'db.sqlite')
    if (raw.includes('<!-- KNOWLEDGE_SCHEMA_HERE -->') && (await Bun.file(dbPath).exists())) {
      try {
        const db = new Database(dbPath, { readonly: true })
        const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
        db.close()
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

    if (raw) parts.push(raw)
  }

  await Bun.write(join(knowledgePath, 'AGENTS.md'), parts.join('\n\n'))
  console.log(`[AGENT] AGENTS.md written (${parts.length} sections)`)
}

// ---------------------------------------------------------------------------
// Streaming API
// ---------------------------------------------------------------------------

export type CopilotChunk =
  | Exclude<AiStreamEvent, { type: 'stream_end' } | { type: 'error' }>
  | {
      type: 'done'
      fullContent: string
      reasoning?: string
      inputTokens?: number
      outputTokens?: number
    }

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
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
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
  model = Bun.env['AI_MODEL'],
  signal?: AbortSignal,
  images?: PiImageContent[],
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium',
  options?: { workflowPayload?: WorkflowPayload; onVmAcquired?: () => void }
): AsyncGenerator<CopilotChunk> {
  const t0 = Date.now()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[AGENT] New request`)
  console.log(`[AGENT]   conv_id  : ${convId}`)
  console.log(`[AGENT]   config   : ${configId}`)
  console.log(`[AGENT]   SERVICE  : ${Bun.env['SERVICE']}`)
  console.log(`[AGENT]   model    : ${model}`)
  console.log(`[AGENT]   prompt   : "${prompt}"`)
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
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')

  try {
    // Step 1 — Get (or create) the VM and Pi RPC client for this conversation
    console.log(`[AGENT] Step 1/2 — Getting VM...`)
    const t1 = Date.now()
    // Refresh AGENTS.md with the current date/time before creating a new VM
    if (!hasVm(convId)) await buildAgentsFile(configId, options?.workflowPayload)
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    const { piClient } = await acquireVm(convId, configId)
    options?.onVmAcquired?.()
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    console.log(`[AGENT] Step 1/2 — VM ready (${Date.now() - t1}ms)`)

    // Set reasoning effort before sending the prompt
    try {
      await piClient.sendCommand({ type: 'set_thinking_level', level: reasoningEffort }, 3_000)
    } catch {
      // Non-fatal: some providers/models ignore thinking level
    }

    // Queue to bridge event callbacks → async generator
    const queue: CopilotChunk[] = []
    let notifyConsumer: (() => void) | null = null
    let streamDone = false
    let streamError: Error | null = null

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
    let reasoningContent = ''
    let inputTokens: number | undefined
    let outputTokens: number | undefined
    let assistantError: Error | null = null
    let toolCount = 0
    const toolStartTimes = new Map<string, number>()
    const askUserQuestions = new Map<string, AskUserQuestion[]>()

    const generationTimeoutMs = 180_000
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
        piClient.sendRaw({ type: 'abort' })
        if (!streamDone) {
          failStream(new Error(`Timeout: no response within ${generationTimeoutMs / 1000}s`))
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

    const unsubscribe = piClient.onEvent((event) => {
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
          if (diagnosticMessage['stopReason'] === 'error') {
            assistantError = new Error(
              typeof diagnosticMessage['errorMessage'] === 'string'
                ? diagnosticMessage['errorMessage']
                : 'Pi assistant response failed'
            )
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
          if (toolCallId) toolStartTimes.set(toolCallId, Date.now())
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
          const toolMs = toolCallId
            ? Date.now() - (toolStartTimes.get(toolCallId) ?? Date.now())
            : 0
          if (toolCallId) toolStartTimes.delete(toolCallId)
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
            piClient.sendRaw({
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
            piClient.sendRaw({
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

        case 'agent_end': {
          if (assistantError) {
            failStream(assistantError)
            break
          }
          // message_end is authoritative for content; stats are fetched separately.
          piClient
            .sendCommand<Record<string, unknown>>({ type: 'get_session_stats' }, 10_000)
            .then((statsResp) => {
              const stats = statsResp['data'] as Record<string, unknown> | undefined
              const tokens = stats?.['tokens'] as Record<string, number> | undefined
              inputTokens = tokens?.['input']
              outputTokens = tokens?.['output']
              console.log(
                `[AGENT]   📊 Tokens — in: ${inputTokens ?? '?'}, out: ${outputTokens ?? '?'} (${s()})`
              )
              enqueue({
                type: 'done',
                fullContent: finalContent,
                reasoning: reasoningContent || undefined,
                inputTokens,
                outputTokens
              })
              endStream()
            })
            .catch((err) => {
              console.warn('[AGENT] Failed to fetch final stats:', err)
              enqueue({
                type: 'done',
                fullContent: finalContent,
                reasoning: reasoningContent || undefined
              })
              endStream()
            })
          break
        }

        case 'auto_retry_end': {
          if (!(event['success'] as boolean)) {
            const errMsg = (event['finalError'] as string | undefined) ?? 'Max retries exceeded'
            console.error(`[AGENT]   ❌ Auto-retry failed (${s()}): ${errMsg}`)
            failStream(new Error(errMsg))
          }
          break
        }

        case 'extension_error':
          console.error(`[AGENT]   ❌ Extension error (${s()}):`, event['error'])
          break
      }
    })

    // Wire abort signal
    const abortHandler = () => {
      console.log('[AGENT] ⚠ Abort signal received — aborting Pi session')
      cancelPendingUiRequest(convId)
      piClient.sendRaw({ type: 'abort' })
      setTimeout(() => {
        if (!streamDone) failStream(new DOMException('Request aborted', 'AbortError'))
      }, 5_000)
    }
    signal?.addEventListener('abort', abortHandler, { once: true })

    // Safety timeout counts generation time only; it is paused during native Pi UI input.
    armGenerationTimeout()

    // Step 2 — Send prompt (Pi acks immediately, then streams events)
    console.log(`[AGENT] Step 2/2 — Sending prompt...`)
    const t3 = Date.now()
    await piClient.sendCommand(
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
    }

    console.log(`[AGENT] ✅ Complete (total: ${Date.now() - t0}ms, tools: ${toolCount})`)
  } finally {
    releaseLock()
    if (locks.get(convId) === lockNext) locks.delete(convId)
    releaseVm(convId)
  }
}

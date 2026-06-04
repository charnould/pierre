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
import { resolve, join } from 'node:path'

import { today_is } from './today-is'
import { acquireVm, hasVm, releaseVm } from './vm-registry'
import type { WorkflowPayload } from './workflow-payload'

// Stable project root anchored to this file's location (utils/ → ../)
const PROJECT_ROOT = resolve(import.meta.dir, '..')

// ---------------------------------------------------------------------------
// Per-conversation lock (prevents concurrent turns on the same session)
// ---------------------------------------------------------------------------

const locks = new Map<string, Promise<void>>()

// ---------------------------------------------------------------------------
// Knowledge directory helpers
// ---------------------------------------------------------------------------

const knowledgePathOnHost = (configId: string): string => {
  const p = join(PROJECT_ROOT, 'datastores', Bun.env['SERVICE']!, 'knowledge', configId)
  if (!existsSync(p)) {
    throw new Error(`[AGENT] Knowledge directory not found: ${p}`)
  }
  return p
}

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
  const skillDir = join(PROJECT_ROOT, 'customization', 'skills', configId)
  const isSkill = existsSync(skillDir)
  const instructionsPath = join(
    PROJECT_ROOT,
    'customization',
    isSkill ? 'skills' : 'chatbot',
    configId,
    'AGENTS.md'
  )

  const parts: string[] = [
    `<session>Current date and time (Europe/Paris): ${today_is()}</session>.`
  ]

  if (existsSync(instructionsPath)) {
    let raw = (await Bun.file(instructionsPath).text()).trim()

    const dbPath = join(knowledgePath, 'db.sqlite')
    if (raw.includes('<!-- KNOWLEDGE_SCHEMA_HERE -->') && existsSync(dbPath)) {
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
  | { type: 'delta'; content: string }
  | {
      type: 'reasoning_delta'
      content: string
      source: 'reasoning' | 'tool_start' | 'tool_result'
    }
  | { type: 'intent'; content: string }
  | { type: 'reset' }
  | {
      type: 'done'
      fullContent: string
      reasoning?: string
      inputTokens?: number
      outputTokens?: number
    }

// Extract a short label from tool arguments to show next to the tool name
function toolArgLabel(args: Record<string, unknown> | undefined): string {
  if (!args) return ''
  const path = args['path'] ?? args['file'] ?? args['filename'] ?? args['filePath']
  if (path) return ` · ${String(path)}`
  const cmd = args['command'] ?? args['cmd']
  if (cmd) return ` · ${String(cmd)}`
  const pattern = args['pattern'] ?? args['query'] ?? args['search']
  if (pattern) return ` · ${String(pattern)}`
  return ''
}

// Filters out noise lines from tool terminal output
const isNoiseLine = (l: string) => !l || /<exited with exit code/i.test(l)

// Format Pi tool result content for display in the reasoning area.
// Pipe characters (|) are escaped to prevent Streamdown from interpreting
// SQLite output as markdown table syntax.
function piToolResultSummary(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const r = result as Record<string, unknown>
  // Standard MCP tool result format: { content: [{ type: 'text', text: '...' }] }
  if (Array.isArray(r['content'])) {
    const lines = (r['content'] as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === 'text' && c.text)
      .flatMap((c) => c.text!.split('\n'))
      .map((l) => l.trim().replace(/\|/g, '\\|'))
      .filter((l) => !isNoiseLine(l))
    return lines.length > 0 ? `\n\n${lines.join('\n\n')}` : ''
  }
  // Fallback: plain text result
  if (typeof r['text'] === 'string') {
    const text = r['text'].trim().replace(/\|/g, '\\|')
    return text ? `\n\n${text}` : ''
  }
  return ''
}

/**
 * Stream a response from Pi as incremental chunks.
 *
 * Yields:
 *   - `delta` chunks as the assistant generates text
 *   - `reasoning_delta` chunks for thinking / tool activity
 *   - `reset` when a tool call interrupts the current response
 *   - `done` with the authoritative full content and token metadata
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
  _attachments?: Array<{ type: 'file'; path: string }>,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium',
  options?: { workflowPayload?: WorkflowPayload }
): AsyncGenerator<CopilotChunk> {
  const t0 = Date.now()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[AGENT] New request`)
  console.log(`[AGENT]   conv_id  : ${convId}`)
  console.log(`[AGENT]   config   : ${configId}`)
  console.log(`[AGENT]   SERVICE  : ${Bun.env['SERVICE']}`)
  console.log(`[AGENT]   model    : ${model}`)
  console.log(`[AGENT]   prompt   : "${prompt}"`)
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
    const { piClient } = await acquireVm(convId, configId)
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
    let toolCount = 0
    const toolStartTimes = new Map<string, number>()

    const s = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

    const unsubscribe = piClient.onEvent((event) => {
      const type = event['type'] as string

      switch (type) {
        case 'agent_start':
          console.log(`[AGENT]   ▶ Agent started (${s()})`)
          break

        case 'message_update': {
          const ae = event['assistantMessageEvent'] as Record<string, unknown> | undefined
          if (!ae) break
          const aeType = ae['type'] as string
          if (aeType === 'text_delta') {
            enqueue({ type: 'delta', content: ae['delta'] as string })
          } else if (aeType === 'thinking_delta') {
            const delta = ae['delta'] as string
            reasoningContent += delta
            enqueue({
              type: 'reasoning_delta',
              source: 'reasoning',
              content: delta
            })
          } else if (aeType === 'toolcall_start') {
            enqueue({ type: 'reset' })
            enqueue({
              type: 'reasoning_delta',
              source: 'tool_start',
              content: '\n\n'
            })
            console.log(`[AGENT]   🔧 Tool call start (${s()})`)
          }
          break
        }

        case 'tool_execution_start': {
          toolCount++
          const toolName = event['toolName'] as string
          const toolCallId = event['toolCallId'] as string | undefined
          const args = event['args'] as Record<string, unknown> | undefined
          const argLabel = toolArgLabel(args)
          if (toolCallId) toolStartTimes.set(toolCallId, Date.now())
          enqueue({
            type: 'reasoning_delta',
            source: 'tool_start',
            content: `\n\n- ${toolName}${argLabel}`
          })
          console.log(`[AGENT]   ↳ Tool #${toolCount} start: ${toolName} (${s()})`)
          break
        }

        case 'tool_execution_end': {
          const toolName = event['toolName'] as string
          const toolCallId = event['toolCallId'] as string | undefined
          const isError = event['isError'] as boolean | undefined
          const result = event['result']
          const toolMs = toolCallId
            ? Date.now() - (toolStartTimes.get(toolCallId) ?? Date.now())
            : 0
          if (toolCallId) toolStartTimes.delete(toolCallId)
          const summary = piToolResultSummary(result)
          enqueue({
            type: 'reasoning_delta',
            source: 'tool_start',
            content: '\n\n'
          })
          if (summary)
            enqueue({
              type: 'reasoning_delta',
              source: 'tool_result',
              content: summary
            })
          console.log(
            `[AGENT]   ↳ Tool done: ${toolName} (${toolMs}ms, ${s()})${isError ? ' [error]' : ''}`
          )
          break
        }

        case 'agent_end': {
          // Fetch final text and token counts, then emit the done chunk
          Promise.all([
            piClient.sendCommand<Record<string, unknown>>(
              { type: 'get_last_assistant_text' },
              10_000
            ),
            piClient.sendCommand<Record<string, unknown>>({ type: 'get_session_stats' }, 10_000)
          ])
            .then(([textResp, statsResp]) => {
              const data = textResp['data'] as Record<string, unknown> | undefined
              finalContent = (data?.['text'] as string | undefined) ?? finalContent
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
      piClient.sendRaw({ type: 'abort' })
      setTimeout(() => {
        if (!streamDone) failStream(new DOMException('Request aborted', 'AbortError'))
      }, 5_000)
    }
    signal?.addEventListener('abort', abortHandler, { once: true })

    // Safety timeout (180s)
    const timeoutId = setTimeout(() => {
      if (!streamDone) failStream(new Error('Timeout: no response within 180s'))
    }, 180_000)

    // Step 2 — Send prompt (Pi acks immediately, then streams events)
    console.log(`[AGENT] Step 2/2 — Sending prompt...`)
    const t3 = Date.now()
    await piClient.sendCommand({ type: 'prompt', message: prompt }, 10_000)
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
      clearTimeout(timeoutId)
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

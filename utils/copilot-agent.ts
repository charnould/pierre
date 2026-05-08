/**
 * GitHub Copilot SDK integration for PIERRE
 *
 * Manages per-conversation Copilot sessions backed by isolated smolVMs.
 * Each conversation (`convId`) gets its own VM where the Copilot CLI runs
 * in TCP server mode. The SDK client on the host connects via `cliUrl`.
 *
 * VM lifecycle is managed by `vm-registry.ts` (30 min inactivity timeout).
 *
 * The agent's working directory inside the VM is `/knowledge`, where the
 * config's knowledge folder is mounted.
 */

import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

import type {
  CopilotClient,
  CopilotSession,
  SessionEvent,
  PermissionRequest,
  PermissionRequestResult
} from '@github/copilot-sdk'

import { today_is } from './today-is'

const denyWrite = (request: PermissionRequest): PermissionRequestResult => {
  if (
    request.kind === 'write' &&
    !(request as unknown as { fileName: string }).fileName.startsWith('/tmp/')
  )
    return { kind: 'reject' }
  return { kind: 'approve-once' }
}

import { parse_markdown_sections } from './parse-markdown-sections'
import { acquireVm, releaseVm } from './vm-registry'

// Stable project root anchored to this file's location (utils/ → ../)
const PROJECT_ROOT = resolve(import.meta.dir, '..')

// ---------------------------------------------------------------------------
// Per-conversation lock (prevents concurrent turns on the same session)
// ---------------------------------------------------------------------------

const locks = new Map<string, Promise<void>>()

// ---------------------------------------------------------------------------
// Knowledge directory helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to a config's knowledge folder on the host.
 * Used to read db.sqlite and inject its schema into the session context.
 */
const knowledgePathOnHost = (configId: string): string => {
  const p = join(PROJECT_ROOT, 'datastores', Bun.env['SERVICE']!, 'knowledge', configId)
  if (!existsSync(p)) {
    throw new Error(`[COPILOT] Knowledge directory not found: ${p}`)
  }
  return p
}

// ---------------------------------------------------------------------------
// Session management (private)
// ---------------------------------------------------------------------------

const openSession = async (
  client: CopilotClient,
  convId: string,
  configId: string,
  model: string | undefined,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<CopilotSession> => {
  // The knowledge dir is mounted at /knowledge inside the VM
  const workingDirectory = '/knowledge'
  // We read the schema from the host path in the additionalContext hook
  const hostKPath = knowledgePathOnHost(configId)
  console.log(`[COPILOT] Knowledge path: ${workingDirectory} (mounted from ${hostKPath})`)

  const skillDir = join(PROJECT_ROOT, 'customization', 'skills', configId)
  const isSkill = existsSync(skillDir)
  const instructionsPath = join(
    PROJECT_ROOT,
    'customization',
    isSkill ? 'skills' : 'chatbot',
    configId,
    'INSTRUCTIONS.md'
  )
  // Skills inject INSTRUCTIONS.md as raw content.
  // Other configs parse the file into named sections (identity, tone, guidelines…).
  // https://github.com/github/copilot-sdk/tree/main/nodejs#system-message-customization
  let systemMessage: object

  if (isSkill) {
    const rawInstructions = existsSync(instructionsPath)
      ? await Bun.file(instructionsPath).text()
      : ''
    systemMessage = {
      content: rawInstructions
    }
  } else {
    const sections = existsSync(instructionsPath)
      ? await parse_markdown_sections(instructionsPath)
      : {}
    systemMessage = {
      mode: 'customize' as const,
      sections: {
        identity: { action: 'replace', content: sections['identity'] ?? '' },
        tone: { action: 'replace', content: sections['tone'] ?? '' },
        guidelines: { action: 'append', content: sections['guidelines'] ?? '' },
        code_change_rules: { action: 'remove' as const },
        environment_context: { action: 'remove' as const },
        tool_instructions: { action: 'remove' as const },
        last_instructions: { action: 'remove' as const },
        safety: { action: 'replace', content: sections['safety'] ?? '' },
        custom_instructions: {
          action: 'replace',
          content: sections['custom_instructions'] ?? ''
        }
      }
    }
  }

  const config = {
    workingDirectory,
    onPermissionRequest: denyWrite,
    model,
    // Pass BYOK provider config directly — the SDK sends it over RPC to the CLI.
    // This is more reliable than env var injection (which breaks in non-interactive shells).
    provider:
      Bun.env['AI_API_KEY'] && Bun.env['AI_BASE_URL']
        ? {
            type: Bun.env['AI_TYPE'] as 'openai' | 'azure' | 'anthropic' | undefined,
            baseUrl: Bun.env['AI_BASE_URL'],
            modelName: Bun.env['AI_MODEL'],
            apiKey: Bun.env['AI_API_KEY']
          }
        : undefined,
    streaming: true,
    reasoningEffort,
    systemMessage,
    hooks: {
      onSessionStart: async (
        input: { source: string; initialPrompt?: string },
        invocation: { sessionId: string }
      ): Promise<{ additionalContext?: string } | void> => {
        console.log(`[COPILOT] Session ${invocation.sessionId} started (source=${input.source})`)

        const parts: string[] = [`Current date and time (Europe/Paris): ${today_is()}.`]

        if (input.source !== 'resume') {
          const dbPath = join(hostKPath, 'db.sqlite')
          if (existsSync(dbPath)) {
            try {
              const db = new Database(dbPath, { readonly: true })
              const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
              db.close()
              if (row?.content) {
                console.log(`[COPILOT] Injected db schema from _readme`)
                parts.push(`The SQLite database is at \`/knowledge/db.sqlite\`.\n\n${row.content}`)
              }
            } catch (err) {
              console.warn('[COPILOT] Could not read db schema:', err)
            }
          }
        }

        return { additionalContext: parts.join('\n\n') }
      }
    }
  }

  const metadata = await client.getSessionMetadata(convId)
  if (metadata) {
    console.log(`[COPILOT] Resuming session ${convId}`)
    return client.resumeSession(convId, config)
  }

  console.log(`[COPILOT] Creating new session ${convId}`)
  return client.createSession({ ...config, sessionId: convId })
}

// ---------------------------------------------------------------------------
// Streaming API
// ---------------------------------------------------------------------------

export type CopilotChunk =
  | { type: 'delta'; content: string }
  | { type: 'reasoning_delta'; content: string; source: 'reasoning' | 'tool_start' | 'tool_result' }
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

type ToolResult = {
  content: string
  detailedContent?: string
  contents?: Array<{
    type: string
    text?: string
    cwd?: string
    exitCode?: number
  }>
}

// Filters out noise lines from tool terminal output
const isNoiseLine = (l: string) => !l || /<exited with exit code/i.test(l)

// Format tool result for display in the reasoning area.
// Pipe characters (|) are escaped to prevent Streamdown from interpreting
// SQLite output as markdown table syntax.
function toolResultSummary(result: ToolResult | undefined): string {
  if (!result) return ''
  // Prefer terminal blocks — show full output, filtering noise lines
  const terminal = result.contents?.find((c) => c.type === 'terminal')
  if (terminal && terminal.text) {
    const lines = terminal.text
      .split('\n')
      .map((l) => l.trim().replace(/\|/g, '\\|'))
      .filter((l) => !isNoiseLine(l))
    if (lines.length === 0) return ''
    return `\n\n${lines.join('\n\n')}`
  }
  // Fall back to detailedContent or content, also filtering noise
  const text = (result.detailedContent ?? result.content ?? '').trim()
  if (!text) return ''
  const lines = text
    .split('\n')
    .map((l) => l.trim().replace(/\|/g, '\\|'))
    .filter((l) => !isNoiseLine(l))
  if (lines.length === 0) return ''
  return `\n\n${lines.join('\n\n')}`
}

/**
 * Stream a response from Copilot as incremental chunks.
 *
 * Yields:
 *   - `delta` chunks as the assistant generates text
 *   - `done` with the authoritative full content and metadata
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
  attachments?: Array<{ type: 'file'; path: string }>,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): AsyncGenerator<CopilotChunk> {
  const t0 = Date.now()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[COPILOT] New request`)
  console.log(`[COPILOT]   conv_id  : ${convId}`)
  console.log(`[COPILOT]   config   : ${configId}`)
  console.log(`[COPILOT]   SERVICE  : ${Bun.env['SERVICE']}`)
  console.log(`[COPILOT]   model    : ${model}`)
  console.log(
    `[COPILOT]   prompt   : "${prompt.substring(0, 120)}${prompt.length > 120 ? '...' : ''}"`
  )
  console.log(`${'='.repeat(60)}`)

  // Bail early if already aborted
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')

  // Inline lock — acquired immediately, released in outer finally
  const prev = locks.get(convId) ?? Promise.resolve()
  let releaseLock!: () => void
  const lockNext = new Promise<void>((r) => {
    releaseLock = r
  })
  locks.set(convId, lockNext)
  await prev
  // Re-check abort after waiting for the lock (caller may have disconnected)
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')

  try {
    // Step 1 — Get (or create) the VM and client for this conversation
    console.log(`[COPILOT] Step 1/3 — Getting VM client...`)
    const t1 = Date.now()
    const { client } = await acquireVm(convId, configId)
    console.log(`[COPILOT] Step 1/3 — Client ready (${Date.now() - t1}ms)`)

    // Step 2 — Open session
    console.log(`[COPILOT] Step 2/3 — Opening session...`)
    const t2 = Date.now()
    const session = await openSession(client, convId, configId, model, reasoningEffort)
    console.log(`[COPILOT] Step 2/3 — Session ready (${Date.now() - t2}ms)`)

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

    // Accumulated state
    let finalContent = ''
    let reasoningContent = ''
    let inputTokens: number | undefined
    let outputTokens: number | undefined
    let toolCount = 0
    const toolNames = new Map<string, string>()
    const toolStartTimes = new Map<string, number>()
    let turnStartTime = 0

    // Elapsed seconds since the request started — shown on every key log line
    const s = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

    // Subscribe to events for streaming + debug logging
    const unsubscribe = session.on((event: SessionEvent) => {
      switch (event.type) {
        case 'assistant.turn_start':
          turnStartTime = Date.now()
          console.log(`[COPILOT]   ▶ Turn started (${s()})`)
          break

        case 'assistant.intent':
          enqueue({ type: 'intent', content: event.data.intent })
          console.log(`[COPILOT]   💡 Intent: ${event.data.intent} (${s()})`)
          break

        case 'assistant.message_delta':
          enqueue({ type: 'delta', content: event.data.deltaContent })
          break

        case 'assistant.reasoning_delta':
          reasoningContent += event.data.deltaContent
          enqueue({
            type: 'reasoning_delta',
            source: 'reasoning',
            content: event.data.deltaContent
          })
          break

        case 'assistant.reasoning':
          // Only enqueue as a single chunk if no streaming deltas were received
          // (some models emit reasoning only as a final complete block, not as deltas)
          if (!reasoningContent) {
            enqueue({
              type: 'reasoning_delta',
              source: 'reasoning',
              content: event.data.content
            })
          }
          reasoningContent = event.data.content
          console.log(`[COPILOT]   💭 Reasoning (${reasoningContent.length} chars, ${s()})`)
          break

        case 'assistant.message':
          if (event.data.toolRequests?.length) {
            // Tool turn — tell the frontend to discard accumulated response deltas
            enqueue({ type: 'reset' })
            enqueue({ type: 'reasoning_delta', source: 'tool_start', content: '\n\n' })
            console.log(
              `[COPILOT]   🔧 Tool requests (${s()}): ${event.data.toolRequests.map((t: { name: string }) => t.name).join(', ')}`
            )
          } else {
            finalContent = event.data.content
            console.log(`[COPILOT]   ✉ Final message (${finalContent.length} chars, ${s()})`)
          }
          break

        case 'tool.execution_start': {
          toolCount++
          // Skip meta-tools that produce noise in the reasoning display
          if (event.data.toolName === 'report_intent') {
            console.log(
              `[COPILOT]   ↳ Tool #${toolCount} start: ${event.data.toolName} (${s()}) [skipped]`
            )
            break
          }
          toolNames.set(event.data.toolCallId, event.data.toolName)
          toolStartTimes.set(event.data.toolCallId, Date.now())
          const args = event.data.arguments as Record<string, unknown> | undefined
          const argLabel = toolArgLabel(args)
          enqueue({
            type: 'reasoning_delta',
            source: 'tool_start',
            content: `\n\n- ${event.data.toolName}${argLabel}`
          })
          console.log(`[COPILOT]   ↳ Tool #${toolCount} start: ${event.data.toolName} (${s()})`)
          break
        }

        case 'tool.execution_partial_result':
          // Partial output not displayed — final result is shown in tool.execution_complete
          break

        case 'tool.execution_progress':
          // Human-readable progress message — show as a sub-line under the current tool
          if (toolNames.has(event.data.toolCallId)) {
            enqueue({
              type: 'reasoning_delta',
              source: 'tool_start',
              content: `  \n_${event.data.progressMessage}_`
            })
          }
          break

        case 'tool.execution_complete': {
          // If the tool was not tracked (e.g. report_intent was skipped), ignore
          if (!toolNames.has(event.data.toolCallId)) {
            console.log(`[COPILOT]   ↳ Tool done: (untracked, ${s()})`)
            break
          }
          const name = toolNames.get(event.data.toolCallId)!
          const toolMs = Date.now() - (toolStartTimes.get(event.data.toolCallId) ?? Date.now())
          toolStartTimes.delete(event.data.toolCallId)
          toolNames.delete(event.data.toolCallId)
          if (event.data.success) {
            const summary = toolResultSummary(event.data.result)
            enqueue({
              type: 'reasoning_delta',
              source: 'tool_start',
              content: `\n\n`
            })
            if (summary) {
              enqueue({
                type: 'reasoning_delta',
                source: 'tool_result',
                content: summary
              })
            }
            console.log(`[COPILOT]   ↳ Tool done: ${name} (${toolMs}ms, ${s()})`)
          } else {
            const errMsg = event.data.error?.message ?? 'erreur inconnue'
            enqueue({
              type: 'reasoning_delta',
              source: 'tool_start',
              content: ` ✗ ${errMsg}`
            })
            console.error(
              `[COPILOT]   ↳ Tool done: ${name} (failed, ${toolMs}ms, ${s()}) — ${event.data.error?.code ?? ''}: ${errMsg}`
            )
          }
          break
        }

        case 'assistant.usage':
          inputTokens = event.data.inputTokens
          outputTokens = event.data.outputTokens
          console.log(
            `[COPILOT]   📊 Tokens — in: ${inputTokens ?? '?'}, out: ${outputTokens ?? '?'}, model: ${event.data.model} (${s()})`
          )
          break

        case 'session.error':
          console.error(`[COPILOT]   ❌ Session error (${s()}): ${event.data.message}`)
          failStream(new Error(event.data.message))
          break

        case 'assistant.turn_end': {
          const turnMs = Date.now() - turnStartTime
          console.log(`[COPILOT]   ■ Turn ended (${turnMs}ms, ${s()})`)
          break
        }

        case 'session.idle':
          console.log(`[COPILOT]   ⏸ Session idle (${s()})`)
          enqueue({
            type: 'done',
            fullContent: finalContent,
            reasoning: reasoningContent || undefined,
            inputTokens,
            outputTokens
          })
          endStream()
          break
      }
    })

    // Wire abort signal
    const abortHandler = () => {
      console.log('[COPILOT] ⚠ Abort signal received — aborting session')
      session.abort().catch(() => {})
      // Safety: if SDK doesn't fire idle/error within 5s, force-end
      setTimeout(() => {
        if (!streamDone) failStream(new DOMException('Request aborted', 'AbortError'))
      }, 5_000)
    }
    signal?.addEventListener('abort', abortHandler, { once: true })

    // Safety timeout (180s)
    const timeoutId = setTimeout(() => {
      if (!streamDone) failStream(new Error('Timeout: no response within 180s'))
    }, 180_000)

    // Step 3 — Send prompt (non-blocking; events arrive via listener)
    console.log(`[COPILOT] Step 3/3 — Sending prompt...`)
    const t3 = Date.now()
    await session.send({ prompt, attachments })
    console.log(`[COPILOT] Step 3/3 — Prompt sent (${Date.now() - t3}ms), streaming events...`)

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
      await session
        .disconnect()
        .catch((e) => console.warn('[COPILOT] Disconnect error (ignored):', e))
    }

    console.log(`[COPILOT] ✅ Complete (total: ${Date.now() - t0}ms, tools: ${toolCount})`)
    if (inputTokens || outputTokens)
      console.log(`[COPILOT]   Tokens — in: ${inputTokens}, out: ${outputTokens}`)
  } finally {
    releaseLock()
    if (locks.get(convId) === lockNext) locks.delete(convId)
    releaseVm(convId)
  }
}

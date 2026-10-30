import {
  LLM_OPERATIONS,
  LLM_PAGE_SIZE,
  LLM_RUN_STATUSES,
  type LlmCompactionRecord,
  type LlmContextUsage,
  type LlmOperation,
  type LlmRun,
  type LlmRunDetails,
  type LlmRunStatus,
  type LlmRunSummary,
  type MeasuredRun,
  periodRange,
  summarizeUsage,
  type UsagePeriod
} from '../../shared/llm-usage'
import { openDatastore } from './datastore-db'
import { timezone } from './setup-store'

export type SessionCounters = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
  cost: number | null
  contextUsage: LlmContextUsage | null
}

const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export const parseSessionCounters = (data: unknown): SessionCounters | null => {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const tokens = record['tokens']
  if (!tokens || typeof tokens !== 'object') return null
  const source = tokens as Record<string, unknown>
  const input = number(source['input'])
  const output = number(source['output'])
  const total = number(source['total'])
  if (input == null || output == null || total == null) return null
  const rawContext =
    record['contextUsage'] && typeof record['contextUsage'] === 'object'
      ? (record['contextUsage'] as Record<string, unknown>)
      : null
  const contextWindow = rawContext ? number(rawContext['contextWindow']) : null
  return {
    input,
    output,
    cacheRead: number(source['cacheRead']) ?? 0,
    cacheWrite: number(source['cacheWrite']) ?? 0,
    total,
    cost: number(record['cost']),
    contextUsage:
      rawContext && contextWindow != null
        ? {
            tokens: number(rawContext['tokens']),
            contextWindow,
            percent: number(rawContext['percent'])
          }
        : null
  }
}

const clamp = (after: number, before: number) => Math.max(0, after - before)

export const deltaSessionCounters = (
  before: SessionCounters,
  after: SessionCounters
): SessionCounters => ({
  input: clamp(after.input, before.input),
  output: clamp(after.output, before.output),
  cacheRead: clamp(after.cacheRead, before.cacheRead),
  cacheWrite: clamp(after.cacheWrite, before.cacheWrite),
  total: clamp(after.total, before.total),
  cost: before.cost != null && after.cost != null ? clamp(after.cost, before.cost) : null,
  contextUsage: after.contextUsage
})

export const neutralError = (error: unknown): string | null => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const clean = message.replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, 300) : null
}

export const jsonSafe = (value: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as unknown
  } catch {
    return null
  }
}

export type NewLlmRun = {
  operation: LlmOperation
  status: LlmRunStatus
  startedAt: string
  durationMs: number
  convId: string | null
  configId: string
  userEmail: string | null
  automationId: string | null
  provider: string | null
  model: string
  responseModels: string[]
  reasoningEffort: string
  before: SessionCounters | null
  after: SessionCounters | null
  reasoning: string
  error: string | null
  tools: LlmRunDetails['tools']
  providerCost: number | null
  retryCount: number
  compactions: LlmCompactionRecord[]
}

export const recordLlmRun = (input: NewLlmRun): void => {
  const delta = input.before && input.after ? deltaSessionCounters(input.before, input.after) : null
  const details: LlmRunDetails = {
    convId: input.convId,
    configId: input.configId,
    userEmail: input.userEmail,
    automationId: input.automationId,
    provider: input.provider,
    model: input.responseModels.at(-1) ?? input.model,
    requestedModel: input.model,
    responseModels: input.responseModels,
    reasoningEffort: input.reasoningEffort,
    tokens: {
      input: delta?.input ?? null,
      output: delta?.output ?? null,
      cacheRead: delta?.cacheRead ?? null,
      cacheWrite: delta?.cacheWrite ?? null
    },
    cost: delta?.cost ?? null,
    providerCost: input.providerCost,
    contextUsage: input.after?.contextUsage ?? null,
    retryCount: input.retryCount,
    compactions: input.compactions,
    reasoning: input.reasoning,
    error: input.error,
    tools: input.tools.map((tool) => ({
      ...tool,
      args: jsonSafe(tool.args),
      result: jsonSafe(tool.result)
    }))
  }
  using db = openDatastore()
  db.run(
    `INSERT INTO llm_runs (
       id, started_at, operation, status, duration_ms, tokens_total, details
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Bun.randomUUIDv7(),
      input.startedAt,
      input.operation,
      input.status,
      input.durationMs,
      delta?.total ?? null,
      JSON.stringify(details)
    ]
  )
}

type SummaryRow = {
  id: string
  started_at: string
  operation: string
  status: string
  duration_ms: number
  tokens_total: number | null
  model: string | null
  reasoning_effort: string | null
  tool_count: number | null
}

const operation = (value: string): LlmOperation =>
  LLM_OPERATIONS.find((item) => item === value) ?? 'chat'

const status = (value: string): LlmRunStatus =>
  LLM_RUN_STATUSES.find((item) => item === value) ?? 'error'

const summary = (row: SummaryRow): LlmRunSummary => ({
  id: row.id,
  startedAt: row.started_at,
  operation: operation(row.operation),
  status: status(row.status),
  durationMs: row.duration_ms,
  tokensTotal: row.tokens_total,
  model: row.model ?? '',
  reasoningEffort: row.reasoning_effort ?? '',
  toolCount: row.tool_count ?? 0
})

const bounds = (period: UsagePeriod, now: Date) => {
  const range = periodRange(now, period, timezone() ?? 'UTC')
  return { start: range.start.toISOString(), end: range.end.toISOString() }
}

export const listLlmRuns = (
  period: UsagePeriod,
  offset: number,
  now = new Date()
): { runs: LlmRunSummary[]; total: number } => {
  const range = bounds(period, now)
  using db = openDatastore()
  const total =
    db
      .query<{ total: number }, [string, string]>(
        `SELECT COUNT(*) AS total FROM llm_runs WHERE started_at >= ? AND started_at < ?`
      )
      .get(range.start, range.end)?.total ?? 0
  const rows = db
    .query<SummaryRow, [string, string, number, number]>(
      `SELECT id, started_at, operation, status, duration_ms, tokens_total,
              json_extract(details, '$.model') AS model,
              json_extract(details, '$.reasoningEffort') AS reasoning_effort,
              json_array_length(json_extract(details, '$.tools')) AS tool_count
       FROM llm_runs
       WHERE started_at >= ? AND started_at < ?
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(range.start, range.end, LLM_PAGE_SIZE, Math.max(0, offset))
  return { total, runs: rows.map(summary) }
}

export const getLlmRun = (id: string): LlmRun | null => {
  using db = openDatastore()
  const row = db
    .query<SummaryRow & { details: string }, [string]>(
      `SELECT id, started_at, operation, status, duration_ms, tokens_total, details,
              json_extract(details, '$.model') AS model,
              json_extract(details, '$.reasoningEffort') AS reasoning_effort,
              json_array_length(json_extract(details, '$.tools')) AS tool_count
       FROM llm_runs WHERE id = ?`
    )
    .get(id)
  if (!row) return null
  return { ...summary(row), details: JSON.parse(row.details) as LlmRunDetails }
}

export const llmUsage = (period: UsagePeriod, now = new Date()) => {
  const zone = timezone() ?? 'UTC'
  const start = periodRange(now, 'year', zone).start.toISOString()
  using db = openDatastore()
  const rows = db
    .query<{ started_at: string; operation: string; tokensTotal: number | null }, [string]>(
      `SELECT started_at, operation, tokens_total AS tokensTotal
       FROM llm_runs WHERE started_at >= ?`
    )
    .all(start)
  const runs: MeasuredRun[] = rows.map((row) => ({
    startedAt: row.started_at,
    operation: operation(row.operation),
    tokensTotal: row.tokensTotal
  }))
  return summarizeUsage(now, zone, period, runs)
}

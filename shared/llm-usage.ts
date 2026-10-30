import { zonedDateParts } from './zoned-date'

export const LLM_OPERATIONS = ['chat', 'workflow', 'automation'] as const
export type LlmOperation = (typeof LLM_OPERATIONS)[number]

export const LLM_RUN_STATUSES = ['success', 'error', 'aborted', 'timeout'] as const
export type LlmRunStatus = (typeof LLM_RUN_STATUSES)[number]

export const USAGE_PERIODS = ['7d', '30d', 'month', 'year'] as const
export type UsagePeriod = (typeof USAGE_PERIODS)[number]

export const LLM_OPERATION_LABELS: Record<LlmOperation, string> = {
  chat: 'Conversations',
  workflow: 'Générations',
  automation: 'Automatisations'
}

export const LLM_RUN_STATUS_LABELS: Record<LlmRunStatus, string> = {
  success: 'Réussi',
  error: 'Échec',
  aborted: 'Interrompu',
  timeout: 'Délai dépassé'
}

export const USAGE_PERIOD_LABELS: Record<UsagePeriod, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  month: 'Mois en cours',
  year: 'Année en cours'
}

export type LlmToolRecord = {
  name: string
  args: unknown
  result: unknown
  durationMs: number
  status: 'ok' | 'error'
}

export type LlmContextUsage = {
  tokens: number | null
  contextWindow: number
  percent: number | null
}

export type LlmCompactionRecord = {
  reason: 'manual' | 'threshold' | 'overflow' | 'unknown'
  status: 'success' | 'error' | 'aborted'
  tokensBefore: number | null
  estimatedTokensAfter: number | null
  error: string | null
}

export type LlmRunDetails = {
  convId: string | null
  configId: string
  userEmail: string | null
  automationId: string | null
  provider: string | null
  model: string
  requestedModel?: string
  responseModels?: string[]
  reasoningEffort: string
  tokens: {
    input: number | null
    output: number | null
    cacheRead: number | null
    cacheWrite: number | null
  }
  cost: number | null
  providerCost?: number | null
  contextUsage?: LlmContextUsage | null
  retryCount?: number
  compactions?: LlmCompactionRecord[]
  reasoning: string
  error: string | null
  tools: LlmToolRecord[]
}

export type LlmRunSummary = {
  id: string
  startedAt: string
  operation: LlmOperation
  status: LlmRunStatus
  durationMs: number
  tokensTotal: number | null
  model: string
  reasoningEffort: string
  toolCount: number
}

export type LlmRun = LlmRunSummary & { details: LlmRunDetails }

export type UsagePoint = { date: string; tokens: number | null }
export type UsageByOperation = { operation: LlmOperation; tokens: number | null }

export type LlmUsageSummary = {
  period: UsagePeriod
  monthTokens: number | null
  monthProjection: number | null
  monthObservedFrom: string | null
  yearProjection: number | null
  yearObservedFrom: string | null
  daily: UsagePoint[]
  byOperation: UsageByOperation[]
}

export type MeasuredRun = {
  startedAt: string
  operation: LlmOperation
  tokensTotal: number | null
}

function offsetMs(date: Date, timeZone: string): number {
  const part = zonedDateParts(date, timeZone)
  const zonedAsUtc = Date.UTC(
    part.year,
    part.month - 1,
    part.day,
    part.hour,
    part.minute,
    part.second
  )
  return zonedAsUtc - date.getTime()
}

export function zonedTime(
  year: number,
  month: number,
  day: number,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second)
  const first = offsetMs(new Date(guess), timeZone)
  const corrected = offsetMs(new Date(guess - first), timeZone)
  return new Date(guess - corrected)
}

export function calendarDate(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const part = zonedDateParts(date, timeZone)
  return { year: part.year, month: part.month, day: part.day }
}

export function dayKey(iso: string, timeZone: string): string {
  const date = calendarDate(new Date(iso), timeZone)
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

function nextMonth(date: { year: number; month: number }) {
  return date.month === 12
    ? { year: date.year + 1, month: 1 }
    : { year: date.year, month: date.month + 1 }
}

export function periodRange(
  now: Date,
  period: UsagePeriod,
  timeZone: string
): { start: Date; end: Date } {
  const today = calendarDate(now, timeZone)
  const end = zonedTime(
    addDays(today, 1).year,
    addDays(today, 1).month,
    addDays(today, 1).day,
    timeZone
  )
  if (period === 'month') return { start: zonedTime(today.year, today.month, 1, timeZone), end }
  if (period === 'year') return { start: zonedTime(today.year, 1, 1, timeZone), end }
  const length = period === '7d' ? 6 : 29
  const startDay = addDays(today, -length)
  return { start: zonedTime(startDay.year, startDay.month, startDay.day, timeZone), end }
}

function boundary(now: Date, timeZone: string, kind: 'month' | 'year') {
  const today = calendarDate(now, timeZone)
  const start =
    kind === 'month'
      ? zonedTime(today.year, today.month, 1, timeZone)
      : zonedTime(today.year, 1, 1, timeZone)
  const next = kind === 'month' ? nextMonth(today) : { year: today.year + 1, month: 1 }
  return { start, end: zonedTime(next.year, next.month, 1, timeZone) }
}

export function projectTokens(
  now: Date,
  timeZone: string,
  runs: MeasuredRun[],
  kind: 'month' | 'year'
): { tokens: number | null; observedFrom: string | null } {
  const range = boundary(now, timeZone, kind)
  const measured = runs.filter((run) => {
    const started = new Date(run.startedAt).getTime()
    return (
      run.tokensTotal != null && started >= range.start.getTime() && started < range.end.getTime()
    )
  })
  if (measured.length === 0) return { tokens: null, observedFrom: null }
  const observedFrom = measured.reduce(
    (earliest, run) => (run.startedAt < earliest ? run.startedAt : earliest),
    measured[0]!.startedAt
  )
  const tokens = measured.reduce((sum, run) => sum + (run.tokensTotal ?? 0), 0)
  const elapsed = Math.max(1, now.getTime() - new Date(observedFrom).getTime())
  const remaining = Math.max(0, range.end.getTime() - now.getTime())
  return { tokens: Math.round(tokens + (tokens / elapsed) * remaining), observedFrom }
}

function tokensFor(runs: MeasuredRun[]): number | null {
  const measured = runs.filter((run) => run.tokensTotal != null)
  if (measured.length === 0) return runs.length === 0 ? 0 : null
  return measured.reduce((sum, run) => sum + (run.tokensTotal ?? 0), 0)
}

export function summarizeUsage(
  now: Date,
  timeZone: string,
  period: UsagePeriod,
  runs: MeasuredRun[]
): LlmUsageSummary {
  const month = boundary(now, timeZone, 'month')
  const monthRuns = runs.filter((run) => {
    const started = new Date(run.startedAt).getTime()
    return started >= month.start.getTime() && started < month.end.getTime()
  })
  const monthProjection = projectTokens(now, timeZone, runs, 'month')
  const yearProjection = projectTokens(now, timeZone, runs, 'year')
  const range = periodRange(now, period, timeZone)
  const visible = runs.filter((run) => {
    const started = new Date(run.startedAt).getTime()
    return started >= range.start.getTime() && started < range.end.getTime()
  })
  const today = calendarDate(now, timeZone)
  const startDay = calendarDate(range.start, timeZone)
  const daily: UsagePoint[] = []
  for (
    let cursor = startDay;
    dayKey(zonedTime(cursor.year, cursor.month, cursor.day, timeZone).toISOString(), timeZone) <=
    dayKey(now.toISOString(), timeZone);
    cursor = addDays(cursor, 1)
  ) {
    const key = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(cursor.day).padStart(2, '0')}`
    const dayRuns = visible.filter((run) => dayKey(run.startedAt, timeZone) === key)
    daily.push({ date: key, tokens: tokensFor(dayRuns) })
    if (cursor.year === today.year && cursor.month === today.month && cursor.day === today.day)
      break
  }
  return {
    period,
    monthTokens: tokensFor(monthRuns),
    monthProjection: monthProjection.tokens,
    monthObservedFrom: monthProjection.observedFrom,
    yearProjection: yearProjection.tokens,
    yearObservedFrom: yearProjection.observedFrom,
    daily,
    byOperation: LLM_OPERATIONS.map((operation) => ({
      operation,
      tokens: tokensFor(visible.filter((run) => run.operation === operation))
    }))
  }
}

export const LLM_PAGE_SIZE = 50

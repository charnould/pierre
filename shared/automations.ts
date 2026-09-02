/** Lifecycle — does the scheduler pick this row up? */
const AUTOMATION_LIFECYCLE_STATUSES = ['scheduled', 'paused', 'running'] as const
export type AutomationLifecycleStatus = (typeof AUTOMATION_LIFECYCLE_STATUSES)[number]

/** Outcome of the last finished run. */
const AUTOMATION_RUN_STATUSES = ['success', 'error'] as const
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number]

const AUTOMATION_TYPES = ['report', 'ticket_reply'] as const
export type AutomationType = (typeof AUTOMATION_TYPES)[number]

export const AUTOMATION_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type AutomationFrequency = (typeof AUTOMATION_FREQUENCIES)[number]

const DAYS_OF_WEEK = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche'
] as const
type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

/** cron DOW: 0 = Sunday … 6 = Saturday (standard crontab). */
const DAY_TO_CRON_DOW: Record<DayOfWeek, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6
}

const CRON_DOW_TO_DAY: Record<number, DayOfWeek> = {
  0: 'dimanche',
  1: 'lundi',
  2: 'mardi',
  3: 'mercredi',
  4: 'jeudi',
  5: 'vendredi',
  6: 'samedi'
}

type CompareOperator = 'gt' | 'gte' | 'lt' | 'lte'

export type TicketFilterRule =
  | { kind: 'values'; column: string; values: string[] }
  | { kind: 'compare'; column: string; operator: CompareOperator; value: string }

export type TicketAutomationFilters = { rules: TicketFilterRule[] }

export type ReportAutomationConfig = {
  prompt: string
  maxReports: number
}

export type TicketReplyAutomationConfig = {
  skillId: 'ticket.answer-ticket'
  channel: 'email' | 'letter'
  ticketFilters: TicketAutomationFilters
  maxItems: number
}

export type AutomationConfig = ReportAutomationConfig | TicketReplyAutomationConfig

/** Form schedule fields (UI) before encoding to cron. */
export type AutomationScheduleForm = {
  frequency: AutomationFrequency
  frequencyDay?: string
  frequencyTime: string
}

type AutomationRecordBase = {
  id: string
  name: string
  description: string
  status: AutomationLifecycleStatus
  owner: string
  mentions: string[]
  cron: string
  next_run_at: string | null
  last_run_at: string | null
  last_run_status: AutomationRunStatus | null
  pinned?: boolean
}

export type AutomationRecord =
  | (AutomationRecordBase & { type: 'report'; config: ReportAutomationConfig })
  | (AutomationRecordBase & { type: 'ticket_reply'; config: TicketReplyAutomationConfig })

export type CreateAutomationBody =
  | {
      type: 'report'
      name: string
      description?: string
      mentions?: string[]
      frequency: AutomationFrequency
      frequencyDay?: string
      frequencyTime: string
      prompt: string
      maxReports?: number
    }
  | {
      type: 'ticket_reply'
      name: string
      description?: string
      mentions?: string[]
      frequency: AutomationFrequency
      frequencyDay?: string
      frequencyTime: string
      channel?: 'email' | 'letter'
      ticketFilters?: TicketAutomationFilters
      maxItems?: number
    }

export type PatchAutomationBody = {
  name?: string
  description?: string
  mentions?: string[]
  status?: 'scheduled' | 'paused'
  frequency?: AutomationFrequency
  frequencyDay?: string
  frequencyTime?: string
  prompt?: string
  maxReports?: number
  channel?: 'email' | 'letter'
  ticketFilters?: TicketAutomationFilters
  maxItems?: number
}

export type UserPreferences = {
  pinned_automation_ids: string[]
  /** Custom display name, or null to use email local-part (login). */
  display_name: string | null
}

/** Max length for a persisted display name. */
const DISPLAY_NAME_MAX = 80

/** Trim + collapse spaces; empty → null; truncate to DISPLAY_NAME_MAX. */
export function normalizeDisplayName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, DISPLAY_NAME_MAX)
}

/** Whether a custom display name matches a reserved name, ignoring case and spacing. */
export function isReservedDisplayName(raw: unknown, reservedName: unknown): boolean {
  const displayName = normalizeDisplayName(raw)
  const reserved = normalizeDisplayName(reservedName)
  return (
    displayName !== null &&
    reserved !== null &&
    displayName.toLowerCase() === reserved.toLowerCase()
  )
}

export function parseUserPreferences(raw: unknown): UserPreferences {
  const empty: UserPreferences = {
    pinned_automation_ids: [],
    display_name: null
  }
  if (raw == null || raw === '') return empty
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return empty
    const obj = parsed as {
      pinned_automation_ids?: unknown
      display_name?: unknown
    }
    const ids = Array.isArray(obj.pinned_automation_ids)
      ? obj.pinned_automation_ids.filter((id): id is string => typeof id === 'string')
      : []
    return {
      pinned_automation_ids: ids,
      display_name: normalizeDisplayName(obj.display_name)
    }
  } catch {
    return empty
  }
}

function parseDailyDays(encoded: string | undefined): DayOfWeek[] {
  if (!encoded?.trim()) return [...DAYS_OF_WEEK]
  if (!encoded.includes(',')) {
    return (DAYS_OF_WEEK as readonly string[]).includes(encoded)
      ? [encoded as DayOfWeek]
      : [...DAYS_OF_WEEK]
  }
  const parts = new Set(encoded.split(',').map((p) => p.trim().toLowerCase()))
  const selected = DAYS_OF_WEEK.filter((d) => parts.has(d))
  return selected.length > 0 ? [...selected] : [...DAYS_OF_WEEK]
}

function encodeDailyDays(days: readonly string[]): string {
  const selected = new Set(days)
  return DAYS_OF_WEEK.filter((d) => selected.has(d)).join(',')
}

function parseYearlyDay(encoded: string | undefined): { day: number; month: number } {
  if (encoded && /^\d{1,2}-\d{1,2}$/.test(encoded)) {
    const parts = encoded.split('-').map(Number)
    if (parts.length !== 2) return { day: 1, month: 1 }
    const [day, month] = parts as [number, number]
    if (day >= 1 && day <= 28 && month >= 1 && month <= 12) return { day, month }
  }
  return { day: 1, month: 1 }
}

function parseTime(hhmm: string): { minute: number; hour: number } {
  const parts = hhmm.split(':').map(Number)
  if (parts.length !== 2) throw new Error(`Invalid time: ${hhmm}`)
  const [h, m] = parts as [number, number]
  if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(m) || m < 0 || m > 59) {
    throw new Error(`Invalid time: ${hhmm}`)
  }
  return { hour: h, minute: m }
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** Encode UI schedule fields into a 5-field cron (minute hour dom month dow). */
export function encodeScheduleToCron(form: AutomationScheduleForm): string {
  const { minute, hour } = parseTime(form.frequencyTime)
  switch (form.frequency) {
    case 'daily': {
      const days = parseDailyDays(form.frequencyDay)
      if (days.length === DAYS_OF_WEEK.length) return `${minute} ${hour} * * *`
      const dows = days.map((d) => DAY_TO_CRON_DOW[d]).sort((a, b) => a - b)
      return `${minute} ${hour} * * ${dows.join(',')}`
    }
    case 'weekly': {
      const day = (
        form.frequencyDay?.includes(',') ? parseDailyDays(form.frequencyDay)[0] : form.frequencyDay
      ) as DayOfWeek | undefined
      const dow = DAY_TO_CRON_DOW[day && day in DAY_TO_CRON_DOW ? day : 'lundi']
      return `${minute} ${hour} * * ${dow}`
    }
    case 'monthly': {
      const day = Number(form.frequencyDay)
      const dom = Number.isInteger(day) && day >= 1 && day <= 28 ? day : 1
      return `${minute} ${hour} ${dom} * *`
    }
    case 'yearly': {
      const { day, month } = parseYearlyDay(form.frequencyDay)
      return `${minute} ${hour} ${day} ${month} *`
    }
  }
}

export type ParsedCron = {
  minute: number
  hour: number
  dom: number | null
  month: number | null
  dows: number[] | null
}

export function parseCronExpression(cron: string): ParsedCron {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`Invalid cron (need 5 fields): ${cron}`)
  const [minuteS, hourS, domS, monthS, dowS] = parts as [string, string, string, string, string]
  const minute = Number(minuteS)
  const hour = Number(hourS)
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error(`Bad minute: ${cron}`)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error(`Bad hour: ${cron}`)

  const dom = domS === '*' ? null : Number(domS)
  const month = monthS === '*' ? null : Number(monthS)
  if (dom !== null && (!Number.isInteger(dom) || dom < 1 || dom > 28)) {
    throw new Error(`Bad day-of-month: ${cron}`)
  }
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new Error(`Bad month: ${cron}`)
  }

  let dows: number[] | null = null
  if (dowS !== '*') {
    dows = []
    for (const token of dowS.split(',')) {
      if (token.includes('-')) {
        const bounds = token.split('-').map(Number)
        if (bounds.length !== 2) throw new Error(`Bad day-of-week: ${cron}`)
        const [a, b] = bounds as [number, number]
        for (let i = a; i <= b; i++) dows.push(i)
      } else {
        dows.push(Number(token))
      }
    }
    if (dows.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new Error(`Bad day-of-week: ${cron}`)
    }
  }

  return { minute, hour, dom, month, dows }
}

/** Decode cron back to form fields (best-effort for expressions we encode). */
export function decodeCronToSchedule(cron: string): AutomationScheduleForm {
  const parsed = parseCronExpression(cron)
  const frequencyTime = formatTime(parsed.hour, parsed.minute)

  if (parsed.month !== null && parsed.dom !== null) {
    return {
      frequency: 'yearly',
      frequencyDay: `${parsed.dom}-${parsed.month}`,
      frequencyTime
    }
  }
  if (parsed.dom !== null && parsed.month === null && parsed.dows === null) {
    return {
      frequency: 'monthly',
      frequencyDay: String(parsed.dom),
      frequencyTime
    }
  }
  if (parsed.dows !== null && parsed.dows.length === 1 && parsed.dom === null) {
    const day = CRON_DOW_TO_DAY[parsed.dows[0]!] ?? 'lundi'
    return { frequency: 'weekly', frequencyDay: day, frequencyTime }
  }
  if (parsed.dows !== null && parsed.dom === null) {
    const days = parsed.dows
      .slice()
      .sort((a, b) => a - b)
      .map((d) => CRON_DOW_TO_DAY[d])
      .filter(Boolean) as DayOfWeek[]
    return {
      frequency: 'daily',
      frequencyDay: encodeDailyDays(days),
      frequencyTime
    }
  }
  return {
    frequency: 'daily',
    frequencyDay: encodeDailyDays(DAYS_OF_WEEK),
    frequencyTime
  }
}

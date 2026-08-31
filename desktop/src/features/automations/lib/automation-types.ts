import { loginFromEmail } from '@/features/activity/lib/notification-types'
import {
  decodeCronToSchedule,
  type AutomationFrequency,
  type AutomationLifecycleStatus,
  type AutomationRecord,
  type AutomationRunStatus,
  type AutomationType,
  type ReportAutomationConfig,
  type TicketAutomationFilters,
  type TicketFilterRule,
  type TicketReplyAutomationConfig
} from '@/shared/types/automations'

/** Owner is a login; the desktop viewer is often the full email. */
export function sameAutomationLogin(a: string, b: string): boolean {
  const left = loginFromEmail(a.trim().toLowerCase())
  const right = loginFromEmail(b.trim().toLowerCase())
  return Boolean(left) && left === right
}

export type { AutomationType, TicketFilterRule }
export type { TicketAutomationFilters }

type AutomationStatus = AutomationLifecycleStatus

export type TicketReplyChannel = 'email' | 'letter'

type AutomationBase = {
  id: string
  name: string
  description: string
  status: AutomationStatus
  lastRunStatus?: AutomationRunStatus | null
  lastRunDate?: string
  nextRunDate?: string
  owner: string
  mentions: string[]
  isCreator: boolean
  pinned: boolean
  frequency: AutomationFrequency
  frequencyDay?: string
  frequencyTime: string
  cron: string
}

export type ReportRun = {
  id: string
  automationId: string
  date: string
  report: string
}

export type ReportAutomation = AutomationBase & {
  type: 'report'
  prompt: string
  maxReports: number
  /** Populated from activities when loaded for history menu. */
  runs: ReportRun[]
}

export type TicketReplyAutomation = AutomationBase & {
  type: 'ticket_reply'
  skillId: 'ticket.answer-ticket'
  channel: TicketReplyChannel
  ticketFilters: TicketAutomationFilters
  maxItems: number
}

export type Automation = ReportAutomation | TicketReplyAutomation

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  report: "Rapport d'analyse",
  ticket_reply: 'Pré-génération'
}

export function isReportAutomation(automation: Automation): automation is ReportAutomation {
  return automation.type === 'report'
}

export function isTicketReplyAutomation(
  automation: Automation
): automation is TicketReplyAutomation {
  return automation.type === 'ticket_reply'
}

export function automationMaxReports(automation: ReportAutomation): number {
  return automation.maxReports
}

export function recordToAutomation(record: AutomationRecord, viewerLogin: string): Automation {
  const schedule = decodeCronToSchedule(record.cron)
  const base: AutomationBase = {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    lastRunStatus: record.last_run_status,
    lastRunDate: record.last_run_at ?? undefined,
    nextRunDate: record.next_run_at ?? undefined,
    owner: record.owner,
    mentions: record.mentions,
    isCreator: sameAutomationLogin(record.owner, viewerLogin),
    pinned: Boolean(record.pinned),
    frequency: schedule.frequency,
    frequencyDay: schedule.frequencyDay,
    frequencyTime: schedule.frequencyTime,
    cron: record.cron
  }
  if (record.type === 'report') {
    const config = record.config as ReportAutomationConfig
    return {
      ...base,
      type: 'report',
      prompt: config.prompt,
      maxReports: config.maxReports,
      runs: []
    }
  }
  const config = record.config as TicketReplyAutomationConfig
  return {
    ...base,
    type: 'ticket_reply',
    skillId: config.skillId,
    channel: config.channel,
    ticketFilters: config.ticketFilters,
    maxItems: config.maxItems
  }
}

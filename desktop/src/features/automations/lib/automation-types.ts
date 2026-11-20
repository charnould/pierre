import { canManageCollaboratorResource } from '@/shared/lib/collaborator-access'
import {
  type AutomationLifecycleStatus,
  type AutomationRecord,
  type AutomationRunStatus,
  type AutomationType,
  type RecurrenceSchedule
} from '@/shared/types/automations'

export type { AutomationType }

type AutomationStatus = AutomationLifecycleStatus

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
  canManage: boolean
  pinned: boolean
  schedule: RecurrenceSchedule
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

export type Automation = ReportAutomation

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  report: "Rapport d'analyse"
}

export function isReportAutomation(automation: Automation): automation is ReportAutomation {
  return automation.type === 'report'
}

export function automationMaxReports(automation: ReportAutomation): number {
  return automation.maxReports
}

export function recordToAutomation(
  record: AutomationRecord,
  viewerLogin: string,
  isAdministrator = false
): Automation {
  const base: AutomationBase = {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    lastRunStatus: record.lastRunStatus,
    lastRunDate: record.lastRunAt ?? undefined,
    nextRunDate: record.nextRunAt ?? undefined,
    owner: record.owner,
    mentions: record.mentions,
    canManage: canManageCollaboratorResource(record.owner, viewerLogin, isAdministrator),
    pinned: Boolean(record.pinned),
    schedule: record.schedule
  }
  return {
    ...base,
    type: 'report',
    prompt: record.config.prompt,
    maxReports: record.config.maxReports,
    runs: []
  }
}

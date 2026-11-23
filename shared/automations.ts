import type { RecurrenceSchedule } from './schedule'

/** Lifecycle — does the scheduler pick this row up? */
const AUTOMATION_LIFECYCLE_STATUSES = ['scheduled', 'paused', 'running'] as const
export type AutomationLifecycleStatus = (typeof AUTOMATION_LIFECYCLE_STATUSES)[number]

/** Outcome of the last finished run. */
const AUTOMATION_RUN_STATUSES = ['success', 'error'] as const
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number]

const AUTOMATION_TYPES = ['report'] as const
export type AutomationType = (typeof AUTOMATION_TYPES)[number]

type ReportAutomationConfig = {
  prompt: string
  maxReports: number
}

export type AutomationConfig = ReportAutomationConfig

type AutomationRecordBase = {
  id: string
  name: string
  description: string
  status: AutomationLifecycleStatus
  owner: string
  mentions: string[]
  schedule: RecurrenceSchedule
  nextRunAt: string | null
  lastRunAt: string | null
  lastRunStatus: AutomationRunStatus | null
  pinned?: boolean
}

export type AutomationRecord = AutomationRecordBase & {
  type: 'report'
  config: ReportAutomationConfig
}

export type CreateAutomationBody = {
  type: 'report'
  name: string
  description?: string
  mentions?: string[]
  schedule: RecurrenceSchedule
  prompt: string
  maxReports?: number
}

export type PatchAutomationBody = {
  name?: string
  description?: string
  mentions?: string[]
  status?: 'scheduled' | 'paused'
  schedule?: RecurrenceSchedule
  prompt?: string
  maxReports?: number
}

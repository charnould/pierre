import { z } from 'zod'

import type { AutomationConfig, AutomationRecord } from '../../../shared/automations'
import type { RecurrenceSchedule } from '../../../shared/schedule'
import { RecurrenceScheduleSchema } from '../schedule'

const StoredReportConfigSchema = z
  .object({
    prompt: z.string(),
    max_reports: z.number().int().positive().max(100)
  })
  .strict()

const StoredAutomationConfigSchema = StoredReportConfigSchema
const LifecycleStatusSchema = z.enum(['scheduled', 'paused', 'running'])
const RunStatusSchema = z.enum(['success', 'error']).nullable()
const StoredAutomationStateSchema = z
  .object({
    type: z.literal('report'),
    status: LifecycleStatusSchema,
    last_run_status: RunStatusSchema,
    schedule: RecurrenceScheduleSchema,
    config: StoredReportConfigSchema
  })
  .strict()

type AutomationState = Pick<
  AutomationRecord,
  'type' | 'status' | 'lastRunStatus' | 'schedule' | 'config'
>

export const storedAutomationConfig = (config: AutomationConfig) =>
  StoredReportConfigSchema.parse({ prompt: config.prompt, max_reports: config.maxReports })

export const parseStoredAutomationConfig = (raw: unknown): AutomationConfig => {
  const stored = StoredAutomationConfigSchema.parse(raw)
  return { prompt: stored.prompt, maxReports: stored.max_reports }
}

export const parseStoredRecurrenceSchedule = (raw: string): RecurrenceSchedule =>
  RecurrenceScheduleSchema.parse(JSON.parse(raw))

export const parseStoredAutomationState = (raw: unknown): AutomationState => {
  const stored = StoredAutomationStateSchema.parse(raw)
  return {
    type: stored.type,
    status: stored.status,
    lastRunStatus: stored.last_run_status,
    schedule: stored.schedule,
    config: {
      prompt: stored.config.prompt,
      maxReports: stored.config.max_reports
    }
  }
}

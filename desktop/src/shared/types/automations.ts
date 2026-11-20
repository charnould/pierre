export type {
  AutomationLifecycleStatus,
  AutomationRecord,
  AutomationRunStatus,
  AutomationType,
  CreateAutomationBody,
  PatchAutomationBody
} from '@pierre/shared/automations'
export type { RecurrenceSchedule } from '@pierre/shared/schedule'

import type {
  AutomationRecord,
  CreateAutomationBody,
  PatchAutomationBody
} from '@pierre/shared/automations'

export type AutomationsListResponse = { data: AutomationRecord[] }
export type AutomationResponse = { data: AutomationRecord }
export type DeleteAutomationResponse = { data: { deleted: true } }

export type ListAutomationsParams = { url: string }
export type CreateAutomationPayload = { url: string } & CreateAutomationBody
export type PatchAutomationPayload = { url: string; id: string; patch: PatchAutomationBody }
export type DeleteAutomationPayload = { url: string; id: string }
export type RunAutomationPayload = { url: string; id: string }
export type PinAutomationPayload = { url: string; id: string }

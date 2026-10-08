export type {
  AutomationFrequency,
  AutomationLifecycleStatus,
  AutomationRecord,
  AutomationRunStatus,
  AutomationType,
  CreateAutomationBody,
  PatchAutomationBody
} from '@pierre/shared/automations'

export { decodeCronToSchedule } from '@pierre/shared/automations'

import type {
  AutomationRecord,
  CreateAutomationBody,
  PatchAutomationBody
} from '@pierre/shared/automations'

export type AutomationsListResponse = { data: AutomationRecord[] }
export type AutomationResponse = { data: AutomationRecord }
export type DeleteAutomationResponse = { data: { deleted: true } }
export type AutomationApiFailure = { error: { message: string } }

export type ListAutomationsParams = { url: string }
export type CreateAutomationPayload = { url: string } & CreateAutomationBody
export type PatchAutomationPayload = { url: string; id: string; patch: PatchAutomationBody }
export type DeleteAutomationPayload = { url: string; id: string }
export type RunAutomationPayload = { url: string; id: string }
export type PinAutomationPayload = { url: string; id: string }

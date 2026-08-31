export type {
  AutomationFrequency,
  AutomationLifecycleStatus,
  AutomationRecord,
  AutomationRunStatus,
  AutomationType,
  CreateAutomationBody,
  PatchAutomationBody,
  ReportAutomationConfig,
  TicketAutomationFilters,
  TicketFilterRule,
  TicketReplyAutomationConfig
} from '../../../../shared/automations'

export { decodeCronToSchedule } from '../../../../shared/automations'

import type {
  AutomationRecord,
  CreateAutomationBody,
  PatchAutomationBody
} from '../../../../shared/automations'

export type AutomationsListResponse = { data: AutomationRecord[] }
export type AutomationResponse = { data: AutomationRecord }
export type DeleteAutomationResponse = { data: { deleted: true } }

export type ListAutomationsParams = { url: string }
export type CreateAutomationPayload = { url: string } & CreateAutomationBody
export type PatchAutomationPayload = { url: string; id: string; patch: PatchAutomationBody }
export type DeleteAutomationPayload = { url: string; id: string }
export type RunAutomationPayload = { url: string; id: string }
export type PinAutomationPayload = { url: string; id: string }

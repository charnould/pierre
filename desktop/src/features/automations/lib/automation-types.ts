export type AutomationStatus = 'success' | 'running' | 'error' | 'paused' | 'scheduled'

export type AutomationFrequency = 'daily' | 'weekly' | 'monthly'

export type CompareOperator = 'gt' | 'gte' | 'lt' | 'lte'

export type TicketFilterRule =
  | { kind: 'values'; column: string; values: string[] }
  | { kind: 'compare'; column: string; operator: CompareOperator; value: string }

export type TicketAutomationFilters = {
  rules: TicketFilterRule[]
}

export type AutomationBase = {
  id: string
  name: string
  description: string
  status: AutomationStatus
  lastRunDate?: string
  nextRunDate?: string
  owner: string
  collaborators: string[]
  isCreator: boolean
  frequency: AutomationFrequency
  frequencyDay?: string
  frequencyTime: string
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
  runs: ReportRun[]
}

export type TicketReplyOutcome = 'generated' | 'skipped_existing_draft' | 'error'

export type TicketReplyRun = {
  id: string
  automationId: string
  date: string
  summary: { total: number; generated: number; skipped: number; errors: number }
  tickets: Array<{ id_reclamation: string; outcome: TicketReplyOutcome; detail?: string }>
}

export type TicketReplyAutomation = AutomationBase & {
  type: 'ticket_reply'
  skillId: 'ticket.answer-ticket'
  ticketFilters: TicketAutomationFilters
  maxRuns: number
  runs: TicketReplyRun[]
}

export type Automation = ReportAutomation | TicketReplyAutomation

export type AutomationType = Automation['type']

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  report: 'Rapport',
  ticket_reply: 'Réponses'
}

export function isReportAutomation(automation: Automation): automation is ReportAutomation {
  return automation.type === 'report'
}

export function isTicketReplyAutomation(
  automation: Automation
): automation is TicketReplyAutomation {
  return automation.type === 'ticket_reply'
}

export function automationMaxRuns(automation: Automation): number {
  return isReportAutomation(automation) ? automation.maxReports : automation.maxRuns
}

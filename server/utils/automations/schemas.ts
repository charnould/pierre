import { z } from 'zod'

import { AUTOMATION_FREQUENCIES } from '../../../shared/automations'

const TicketFilterRuleSchema = z.union([
  z.object({
    kind: z.literal('values'),
    column: z.string().trim().min(1),
    values: z.array(z.string())
  }),
  z.object({
    kind: z.literal('compare'),
    column: z.string().trim().min(1),
    operator: z.enum(['gt', 'gte', 'lt', 'lte']),
    value: z.string()
  })
])

const ReportConfigSchema = z.object({
  prompt: z.string(),
  maxReports: z.number().int().positive().max(100)
})

const TicketReplyConfigSchema = z.object({
  skillId: z.literal('ticket.answer-ticket'),
  channel: z.enum(['email', 'letter']),
  ticketFilters: z.object({ rules: z.array(TicketFilterRuleSchema) }),
  maxItems: z.number().int().positive().max(500)
})

export const AutomationConfigSchema = z.union([ReportConfigSchema, TicketReplyConfigSchema])

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const DAYS = new Set(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])

export const automation_schedule_error = (
  frequency: (typeof AUTOMATION_FREQUENCIES)[number],
  frequencyDay: string | undefined
): string | null => {
  if (frequency === 'daily') {
    if (!frequencyDay) return null
    const days = frequencyDay.split(',').map((day) => day.trim().toLowerCase())
    return days.length > 0 && days.every((day) => DAYS.has(day))
      ? null
      : 'frequencyDay quotidien invalide'
  }
  if (frequency === 'weekly') {
    return frequencyDay && DAYS.has(frequencyDay.trim().toLowerCase())
      ? null
      : 'frequencyDay hebdomadaire invalide'
  }
  if (frequency === 'monthly') {
    return /^(?:[1-9]|1\d|2[0-8])$/.test(frequencyDay ?? '')
      ? null
      : 'frequencyDay mensuel invalide'
  }
  if (!/^(?:[1-9]|1\d|2[0-8])-(?:[1-9]|1[0-2])$/.test(frequencyDay ?? '')) {
    return 'frequencyDay annuel invalide'
  }
  return null
}

const validate_schedule = (
  value: { frequency: (typeof AUTOMATION_FREQUENCIES)[number]; frequencyDay?: string },
  context: z.RefinementCtx
) => {
  const message = automation_schedule_error(value.frequency, value.frequencyDay)
  if (message) context.addIssue({ code: 'custom', path: ['frequencyDay'], message })
}

export const CreateAutomationBodySchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('report'),
        name: z.string().trim().min(1),
        description: z.string().default(''),
        mentions: z.array(z.string().trim().min(1)).default([]),
        frequency: z.enum(AUTOMATION_FREQUENCIES),
        frequencyDay: z.string().optional(),
        frequencyTime: HHMM,
        prompt: z.string(),
        maxReports: z.number().int().positive().max(100).default(6)
      })
      .strict(),
    z
      .object({
        type: z.literal('ticket_reply'),
        name: z.string().trim().min(1),
        description: z.string().default(''),
        mentions: z.array(z.string().trim().min(1)).default([]),
        frequency: z.enum(AUTOMATION_FREQUENCIES),
        frequencyDay: z.string().optional(),
        frequencyTime: HHMM,
        channel: z.enum(['email', 'letter']).default('email'),
        ticketFilters: z.object({ rules: z.array(TicketFilterRuleSchema) }).default({ rules: [] }),
        maxItems: z.number().int().positive().max(500).default(20)
      })
      .strict()
  ])
  .superRefine(validate_schedule)

export const PatchAutomationBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    mentions: z.array(z.string().trim().min(1)).optional(),
    status: z.enum(['scheduled', 'paused']).optional(),
    frequency: z.enum(AUTOMATION_FREQUENCIES).optional(),
    frequencyDay: z.string().optional(),
    frequencyTime: HHMM.optional(),
    prompt: z.string().optional(),
    maxReports: z.number().int().positive().max(100).optional(),
    channel: z.enum(['email', 'letter']).optional(),
    ticketFilters: z.object({ rules: z.array(TicketFilterRuleSchema) }).optional(),
    maxItems: z.number().int().positive().max(500).optional()
  })
  .strict()

import { z } from 'zod'

import { RecurrenceScheduleSchema } from '../schedule'

export const CreateAutomationBodySchema = z
  .object({
    type: z.literal('report'),
    name: z.string().trim().min(1),
    description: z.string().default(''),
    mentions: z.array(z.string().trim().min(1)).default([]),
    schedule: RecurrenceScheduleSchema,
    prompt: z.string(),
    maxReports: z.number().int().positive().max(100).default(6)
  })
  .strict()

export const PatchAutomationBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    mentions: z.array(z.string().trim().min(1)).optional(),
    status: z.enum(['scheduled', 'paused']).optional(),
    schedule: RecurrenceScheduleSchema.optional(),
    prompt: z.string().optional(),
    maxReports: z.number().int().positive().max(100).optional()
  })
  .strict()

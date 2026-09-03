import { z } from 'zod'

export const ABOUT_SUBJECTS = ['locataire', 'client', 'lot', 'batiment'] as const

export const AnswerPayloadSchema = z
  .object({
    version: z.literal(1).default(1),
    workflow: z.literal('answer'),
    channel: z.enum(['email', 'letter']).optional(),
    id_reclamation: z.string().nullable().optional(),
    id_locataire: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    context: z.string().nullable().optional()
  })
  .superRefine((p, ctx) => {
    if (!p.id_reclamation?.trim() && !p.message?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'id_reclamation or message required',
        path: ['id_reclamation']
      })
    }
  })

export const SynthesePayloadSchema = z.object({
  version: z.literal(1).default(1),
  workflow: z.literal('synthese'),
  about_subject: z.enum(ABOUT_SUBJECTS),
  identifiant: z.string().min(1),
  year_from: z.number().int(),
  year_to: z.number().int(),
  context: z.string().nullable().optional()
})

export const WorkflowPayloadSchema = z.discriminatedUnion('workflow', [
  AnswerPayloadSchema,
  SynthesePayloadSchema
])

export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>
export type SynthesePayload = z.infer<typeof SynthesePayloadSchema>

export function parseWorkflowPayload(raw: string): WorkflowPayload | null {
  try {
    const parsed = WorkflowPayloadSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const WORKFLOW_USER_PROMPT = 'Exécute la mission.'

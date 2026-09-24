import { z } from 'zod'

const ID_KEYS = ['id_client', 'id_locataire', 'id_lot', 'id_batiment'] as const

const WorkflowPayloadSchema = z
  .object({
    id_client: z.string().min(1).optional(),
    id_locataire: z.string().min(1).optional(),
    id_lot: z.string().min(1).optional(),
    id_batiment: z.string().min(1).optional(),
    year_from: z.number().int(),
    year_to: z.number().int(),
    context: z.string().nullable().optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    const present = ID_KEYS.filter((key) => payload[key])
    if (present.length === 1) return
    ctx.addIssue({
      code: 'custom',
      message: 'exactly one of id_client, id_locataire, id_lot, id_batiment',
      path: [present[0] ?? 'id_locataire']
    })
  })

export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>

export function parseWorkflowPayload(raw: string): WorkflowPayload | null {
  try {
    const parsed = WorkflowPayloadSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const WORKFLOW_USER_PROMPT = 'Exécute la mission.'

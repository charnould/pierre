import { z } from 'zod'

const ID_KEYS = ['id_client', 'id_locataire', 'id_lot', 'id_batiment'] as const
const WORKFLOW_PAYLOAD_MARKER = '<!-- WORKFLOW_PAYLOAD_HERE -->'

const AboutWorkflowPayloadSchema = z
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

const RepaymentWorkflowPayloadSchema = z
  .object({
    id_locataire: z.string().trim().min(1),
    context: z.string().trim().min(1)
  })
  .strict()

const RepliesWorkflowPayloadSchema = z
  .object({
    id_reclamation: z.string().trim().min(1),
    context: z.string().trim().min(1)
  })
  .strict()

export type WorkflowPayload =
  | z.infer<typeof AboutWorkflowPayloadSchema>
  | z.infer<typeof RepaymentWorkflowPayloadSchema>
  | z.infer<typeof RepliesWorkflowPayloadSchema>

export function parseWorkflowPayload(raw: string, skillId = 'about'): WorkflowPayload | null {
  try {
    const schema =
      skillId === 'repayment'
        ? RepaymentWorkflowPayloadSchema
        : skillId === 'replies'
          ? RepliesWorkflowPayloadSchema
          : AboutWorkflowPayloadSchema
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function injectWorkflowPayload(
  prompt: string,
  payload: Record<string, unknown> | null | undefined
): string {
  if (!payload) return prompt
  const compact = Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
  )
  if (Object.keys(compact).length === 0) return prompt
  const json = JSON.stringify(compact, null, 2)
  if (prompt.includes(WORKFLOW_PAYLOAD_MARKER))
    return prompt.replaceAll(WORKFLOW_PAYLOAD_MARKER, json)
  return [prompt.trim(), json].filter(Boolean).join('\n\n')
}

export const WORKFLOW_USER_PROMPT = 'Exécute la mission.'

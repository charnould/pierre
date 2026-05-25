import { z } from 'zod'

export const ABOUT_SUBJECTS = ['locataire', 'lot', 'programme'] as const

export const AnswerPayloadSchema = z
  .object({
    version: z.literal(1).default(1),
    workflow: z.literal('answer'),
    mode: z.enum(['affaire', 'message']),
    id_request: z.string().nullable().optional(),
    id_locataire: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    contexte: z.string().nullable().optional()
  })
  .superRefine((p, ctx) => {
    if (p.mode === 'affaire') {
      if (!p.id_request?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'id_request required', path: ['id_request'] })
      }
    } else {
      if (!p.id_locataire?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'id_locataire required', path: ['id_locataire'] })
      }
      if (!p.message?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'message required', path: ['message'] })
      }
    }
  })

export const SynthesePayloadSchema = z.object({
  version: z.literal(1).default(1),
  workflow: z.literal('synthese'),
  about_subject: z.enum(ABOUT_SUBJECTS),
  identifiant: z.string().min(1),
  year_from: z.number().int()
})

export const WorkflowPayloadSchema = z.discriminatedUnion('workflow', [
  AnswerPayloadSchema,
  SynthesePayloadSchema
])

export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>
export type SynthesePayload = z.infer<typeof SynthesePayloadSchema>

function compactPayload(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
}

export function formatWorkflowPrompt(payload: WorkflowPayload): string {
  const json = JSON.stringify(compactPayload(payload as Record<string, unknown>), null, 2)

  if (payload.workflow === 'synthese') {
    return `# Données structurées de la demande

\`\`\`json
${json}
\`\`\`

## Consignes

- \`workflow: "synthese"\` : produire une synthèse à partir de \`identifiant\` et \`about_subject\`.
- \`year_from\` : ne pas remonter avant cette année dans l'historique.
- Interroger la base avec la clé adaptée (\`id_locataire\`, patrimoine ou programme selon \`about_subject\`).`
  }

  const modeRules =
    payload.mode === 'affaire'
      ? `- \`mode: "affaire"\` : partir de \`id_request\` pour retrouver le dossier ; le message locataire peut être absent.`
      : `- \`mode: "message"\` : \`message\` est le texte du locataire ; \`id_locataire\` identifie le dossier.`

  return `# Données structurées de la demande

\`\`\`json
${json}
\`\`\`

## Consignes

${modeRules}
- \`contexte\` : notes du chargé de relation-client — **prioritaires** sur toute inférence.`
}

export function parseWorkflowPayload(raw: string): WorkflowPayload | null {
  try {
    const parsed = WorkflowPayloadSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function buildLegacyPrompt(message: string, context: string): string {
  return context.trim()
    ? `# Message du locataire\n\n${message}\n\n# Contexte additionnel mentionné par le chargé de relation-client\n\n${context}`
    : message
}

export function resolveAnswerPrompt(
  payloadRaw: string | null,
  message: string,
  context: string
): string {
  if (payloadRaw?.trim()) {
    const payload = parseWorkflowPayload(payloadRaw)
    if (payload) return formatWorkflowPrompt(payload)
  }
  return buildLegacyPrompt(message, context)
}

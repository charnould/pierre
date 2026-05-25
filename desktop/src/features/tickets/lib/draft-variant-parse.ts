import { parseWorkflowStream, TICKET_ANSWER_SKILL } from '@/shared/lib/parse-result'

import type { DraftVariantContent, DraftVariants } from './ticket-draft-revision'

export function parseDraftRaw(raw: string | null): DraftVariantContent {
  if (!raw?.trim()) return { body: '', subject: '' }
  const parsed = parseWorkflowStream(raw, TICKET_ANSWER_SKILL, false)
  return { body: parsed.output, subject: parsed.subject }
}

export function resolveDraftVariants(draft: {
  generated_output: string | null
  edited_output: string | null
}): DraftVariants {
  const generated = parseDraftRaw(draft.generated_output)
  const hasEdited = !!draft.edited_output?.trim()
  const edited = hasEdited ? parseDraftRaw(draft.edited_output) : null
  return { generated, edited, hasEdited }
}

import type {
  PutTicketDraftEditPayload,
  PutTicketDraftFeedbackPayload,
  PutTicketDraftGenerationPayload
} from '@/shared/types/ticket-draft'

export function buildGenerationDraftPayload(input: {
  id_reclamation: string
  id_skill: string
  channel?: 'email' | 'letter'
  generated_output: string
  generated_reasoning?: string
  generated_duration_ms?: number
}): PutTicketDraftGenerationPayload {
  return {
    save_kind: 'generation',
    id_reclamation: input.id_reclamation.trim(),
    id_skill: input.id_skill,
    channel: input.channel,
    generated_output: input.generated_output,
    generated_reasoning: input.generated_reasoning,
    generated_duration_ms: input.generated_duration_ms
  }
}

export function buildEditDraftPayload(input: {
  id_reclamation: string
  id_skill: string
  edited_output: string
}): PutTicketDraftEditPayload {
  return {
    save_kind: 'edit',
    id_reclamation: input.id_reclamation.trim(),
    id_skill: input.id_skill,
    edited_output: input.edited_output
  }
}

export function buildFeedbackDraftPayload(input: {
  id_reclamation: string
  id_skill: string
  feedback_rating?: number | null
  feedback_comment?: string | null
}): PutTicketDraftFeedbackPayload {
  return {
    save_kind: 'feedback',
    id_reclamation: input.id_reclamation.trim(),
    id_skill: input.id_skill,
    feedback_rating: input.feedback_rating,
    feedback_comment: input.feedback_comment
  }
}

export function canPersistTicketDraft(id_reclamation: string, isOutput: boolean): boolean {
  return isOutput && id_reclamation.trim().length > 0
}

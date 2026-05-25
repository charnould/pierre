export type PutTicketDraftGenerationPayload = {
  save_kind: 'generation'
  id_reclamation: string
  id_skill: string
  channel?: 'email' | 'letter'
  generated_output: string
  generated_reasoning?: string
  generated_duration_ms?: number
}

export type PutTicketDraftEditPayload = {
  save_kind: 'edit'
  id_reclamation: string
  id_skill: string
  edited_output: string
}

export type PutTicketDraftFeedbackPayload = {
  save_kind: 'feedback'
  id_reclamation: string
  id_skill: string
  feedback_rating?: number | null
  feedback_comment?: string | null
}

export type PutTicketDraftPayload =
  | PutTicketDraftGenerationPayload
  | PutTicketDraftEditPayload
  | PutTicketDraftFeedbackPayload

export type TicketDraft = {
  id_reclamation: string
  id_skill: string
  channel: string | null
  generated_output: string | null
  generated_reasoning: string | null
  generated_duration_ms: number | null
  generated_at: string
  generated_by: string
  automation_id: string | null
  edited_output: string | null
  edited_at: string | null
  edited_by: string | null
  feedback_rating: number | null
  feedback_comment: string | null
  feedback_at: string | null
  feedback_by: string | null
}

export type PutTicketDraftResult = {
  ok: true
  generated_at: string
  generated_by: string
  automation_id: string | null
  edited_at: string | null
  edited_by: string | null
  feedback_at: string | null
  feedback_by: string | null
}

export type GetTicketDraftResult = {
  data: TicketDraft | TicketDraft[] | null
}

export const draftDisplayOutput = (draft: TicketDraft): string =>
  draft.edited_output ?? draft.generated_output ?? ''

export const draftIsAutomationGenerated = (draft: TicketDraft): boolean =>
  draft.automation_id != null && draft.automation_id.length > 0

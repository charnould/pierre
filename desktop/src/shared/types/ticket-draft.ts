export type TicketDraft = {
  activity_id: number
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

export type GetTicketDraftResult = {
  data: TicketDraft | TicketDraft[] | null
}

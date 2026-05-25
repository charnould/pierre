import { TICKET_ANSWER_SKILL } from '@/shared/lib/parse-result'
import type { TicketDraft } from '@/shared/types/ticket-draft'

export function draftIdSkillsFromResponse(data: TicketDraft | TicketDraft[] | null | undefined) {
  if (!data) return []
  if (Array.isArray(data)) {
    return data
      .map((d) => d.id_skill)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
  }
  return typeof data.id_skill === 'string' && data.id_skill.length > 0 ? [data.id_skill] : []
}

export function draftAnswerChannelFromResponse(
  data: TicketDraft | TicketDraft[] | null | undefined
): string | null {
  if (!data) return null
  const drafts = Array.isArray(data) ? data : [data]
  const answer = drafts.find((d) => d.id_skill === TICKET_ANSWER_SKILL)
  return answer?.channel ?? null
}

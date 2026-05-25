import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import { formatToWire } from '@/features/tickets/lib/knowledge-skills'
import {
  TICKET_DRAFT_ICON_ENTRIES,
  draftHasFormat
} from '@/features/tickets/lib/ticket-draft-icons'
import type { TicketDraft } from '@/shared/types/ticket-draft'

export type ResolveDraftResult = {
  draft: TicketDraft
  format: TicketSkillKey
  id_skill: string
}

export function resolveDraftToLoad(
  drafts: TicketDraft[],
  preferredFormat: TicketSkillKey,
  answerChannel?: string | null
): ResolveDraftResult | null {
  if (drafts.length === 0) return null

  const draftIdSkills = drafts.map((d) => d.id_skill)
  const channel =
    answerChannel ?? drafts.find((d) => d.id_skill === 'ticket.answer-ticket')?.channel ?? null

  if (draftHasFormat(draftIdSkills, preferredFormat, channel)) {
    const wire = formatToWire(preferredFormat)
    const draft = drafts.find((d) => d.id_skill === wire.id_skill)
    if (draft) {
      return { draft, format: preferredFormat, id_skill: wire.id_skill }
    }
  }

  for (const { format } of TICKET_DRAFT_ICON_ENTRIES) {
    if (!draftHasFormat(draftIdSkills, format, channel)) continue
    const wire = formatToWire(format)
    const draft = drafts.find((d) => d.id_skill === wire.id_skill)
    if (draft) {
      return { draft, format, id_skill: wire.id_skill }
    }
  }

  return null
}

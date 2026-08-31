import {
  TICKET_SKILL_OPTIONS,
  formatToWire,
  type TicketSkillKey
} from '@/features/tickets/lib/knowledge-skills'

export type TicketDraftIconEntry = {
  format: TicketSkillKey
  id_skill: string
  channel?: 'email' | 'letter'
  letter: string
  label: string
  segmentLabel: string
}

const LETTER_BY_FORMAT: Record<TicketSkillKey, string> = {
  ticketReplyEmail: 'N',
  ticketReplyLetter: 'P',
  ticketWriteMemo: 'I'
}

export const TICKET_DRAFT_ICON_ENTRIES: TicketDraftIconEntry[] = TICKET_SKILL_OPTIONS.map((opt) => {
  const wire = formatToWire(opt.value)
  return {
    format: opt.value,
    id_skill: wire.id_skill,
    channel: wire.channel,
    letter: LETTER_BY_FORMAT[opt.value],
    label: opt.label,
    segmentLabel: opt.segmentLabel
  }
})

export function draftHasFormat(
  draft_id_skills: string[] | undefined,
  format: TicketSkillKey,
  answer_channel?: string | null
): boolean {
  if (!Array.isArray(draft_id_skills)) return false
  const wire = formatToWire(format)
  if (!draft_id_skills.includes(wire.id_skill)) return false
  if (format === 'ticketReplyEmail') {
    return !answer_channel || answer_channel === 'email'
  }
  if (format === 'ticketReplyLetter') {
    return answer_channel === 'letter'
  }
  return true
}

const DRAFT_ICON_TOOLTIP: Record<TicketSkillKey, { generate: string; read: string }> = {
  ticketReplyEmail: {
    generate: 'Générer une réponse numérique',
    read: 'Lire la réponse numérique'
  },
  ticketReplyLetter: {
    generate: 'Générer une réponse papier',
    read: 'Lire la réponse papier'
  },
  ticketWriteMemo: {
    generate: 'Générer une note interne',
    read: 'Lire la note interne'
  }
}

export function draftIconTooltip(format: TicketSkillKey, hasDraft: boolean): string {
  const tooltip = DRAFT_ICON_TOOLTIP[format]
  return hasDraft ? tooltip.read : tooltip.generate
}

export function draftIsAutomation(
  format: TicketSkillKey,
  draft_id_skills: string[] | undefined,
  draft_answer_channel: string | null | undefined,
  draft_automation_skills: string[] | undefined
): boolean {
  if (!draft_automation_skills?.length) return false
  if (!draftHasFormat(draft_id_skills, format, draft_answer_channel)) return false
  const { id_skill } = formatToWire(format)
  return draft_automation_skills.includes(id_skill)
}

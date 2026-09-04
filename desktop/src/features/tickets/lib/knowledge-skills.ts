export const KNOWLEDGE_SKILL = {
  repaymentCreatePlan: 'repayment.create-plan',
  ticketAnswerTicket: 'ticket.answer-ticket',
  ticketWriteMemo: 'ticket.write-memo',
  ticketSummarizeTicket: 'ticket.summarize-ticket',
  aboutSummary: 'about.summary'
} as const

/** UI format keys — maps to wire skill + optional channel. */
export const TICKET_SKILL_KEYS = [
  'ticketReplyEmail',
  'ticketReplyLetter',
  'ticketWriteMemo'
] as const

export const ABOUT_SUBJECTS = ['locataire', 'client', 'lot', 'batiment'] as const

export type TicketSkillKey = (typeof TICKET_SKILL_KEYS)[number]
export type AboutSubject = (typeof ABOUT_SUBJECTS)[number]

export type AnswerChannel = 'sms' | 'email' | 'letter'

export const TICKET_SKILL_OPTIONS: {
  value: TicketSkillKey
  label: string
  description: string
  segmentLabel: string
}[] = [
  {
    value: 'ticketReplyEmail',
    label: 'Format numérique',
    description: 'Réponse par email ou message numérique au locataire.',
    segmentLabel: 'Numérique'
  },
  {
    value: 'ticketReplyLetter',
    label: 'Format papier',
    description: 'Courrier imprimable au format lettre officielle.',
    segmentLabel: 'Papier'
  },
  {
    value: 'ticketWriteMemo',
    label: 'Note interne',
    description: 'Mémo de travail interne, non destiné au locataire.',
    segmentLabel: 'Note interne'
  }
]

export type TicketWire = {
  id_skill: string
  channel?: AnswerChannel
}

export function formatToWire(format: TicketSkillKey): TicketWire {
  switch (format) {
    case 'ticketReplyEmail':
      return { id_skill: KNOWLEDGE_SKILL.ticketAnswerTicket, channel: 'email' }
    case 'ticketReplyLetter':
      return { id_skill: KNOWLEDGE_SKILL.ticketAnswerTicket, channel: 'letter' }
    case 'ticketWriteMemo':
      return { id_skill: KNOWLEDGE_SKILL.ticketWriteMemo }
  }
}

export function formatFromDraft(
  id_skill: string,
  channel?: string | null
): TicketSkillKey | undefined {
  if (id_skill === KNOWLEDGE_SKILL.ticketWriteMemo) return 'ticketWriteMemo'
  if (id_skill === KNOWLEDGE_SKILL.ticketAnswerTicket) {
    return channel === 'letter' ? 'ticketReplyLetter' : 'ticketReplyEmail'
  }
  return undefined
}

/** Skills that ship a `template.docx` under `customization/skills/<id>/`. */
const SKILLS_WITH_DOCX = new Set<string>([KNOWLEDGE_SKILL.ticketAnswerTicket])

export function skillHasDocxTemplate(skillId: string): boolean {
  return SKILLS_WITH_DOCX.has(skillId)
}

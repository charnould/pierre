export const KNOWLEDGE_SKILL = {
  repaymentCreatePlan: 'repayment.create-plan',
  ticketAnswerTicket: 'ticket.answer-ticket',
  ticketWriteMemo: 'ticket.write-memo',
  ticketRewriteTicket: 'ticket.rewrite-ticket',
  aboutSummary: 'about.summary'
} as const

/** UI format keys — maps to wire skill + optional channel. */
export const TICKET_SKILL_KEYS = [
  'ticketReplyEmail',
  'ticketReplyLetter',
  'ticketWriteMemo',
  'ticketRewriteTicket'
] as const

export const ABOUT_SKILL_KEYS = [
  'aboutSummary'
] as const satisfies readonly (keyof typeof KNOWLEDGE_SKILL)[]

export const ABOUT_SUBJECTS = ['locataire', 'lot', 'programme'] as const

export type TicketSkillKey = (typeof TICKET_SKILL_KEYS)[number]
export type AboutSkillKey = (typeof ABOUT_SKILL_KEYS)[number]
export type AboutSubject = (typeof ABOUT_SUBJECTS)[number]

export type AnswerChannel = 'email' | 'letter'

export const TICKET_SKILL_OPTIONS: {
  value: TicketSkillKey
  label: string
  description: string
  segmentLabel: string
  key: string
}[] = [
  {
    value: 'ticketReplyEmail',
    label: 'Format numérique',
    description: 'Réponse par email ou message numérique au locataire.',
    segmentLabel: 'Numérique',
    key: 'a'
  },
  {
    value: 'ticketReplyLetter',
    label: 'Format papier',
    description: 'Courrier imprimable au format lettre officielle.',
    segmentLabel: 'Papier',
    key: 'b'
  },
  {
    value: 'ticketRewriteTicket',
    label: 'Reformulation',
    description: 'Reformuler le ticket initial pour le rendre lisible et compréhensible.',
    segmentLabel: 'Réclamation',
    key: 'c'
  },
  {
    value: 'ticketWriteMemo',
    label: 'Note interne',
    description: 'Mémo de travail interne, non destiné au locataire.',
    segmentLabel: 'Note interne',
    key: 'd'
  }
]

const TICKET_SKILL_BY_HOTKEY: Record<string, TicketSkillKey> = Object.fromEntries(
  TICKET_SKILL_OPTIONS.map((o) => [o.key, o.value])
) as Record<string, TicketSkillKey>

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
    case 'ticketRewriteTicket':
      return { id_skill: KNOWLEDGE_SKILL.ticketRewriteTicket }
  }
}

export function formatFromDraft(
  id_skill: string,
  channel?: string | null
): TicketSkillKey | undefined {
  if (id_skill === KNOWLEDGE_SKILL.ticketWriteMemo) return 'ticketWriteMemo'
  if (id_skill === KNOWLEDGE_SKILL.ticketRewriteTicket) return 'ticketRewriteTicket'
  if (id_skill === KNOWLEDGE_SKILL.ticketAnswerTicket) {
    return channel === 'letter' ? 'ticketReplyLetter' : 'ticketReplyEmail'
  }
  return undefined
}

export function ticketSkillFromHotkey(key: string): TicketSkillKey | undefined {
  return TICKET_SKILL_BY_HOTKEY[key]
}

/** Keyboard shortcuts for the answer workflow format picker (form step only). */
export function ticketSkillKeyActions(
  setSkill: (skill: TicketSkillKey) => void
): Record<string, () => void> {
  return Object.fromEntries(TICKET_SKILL_OPTIONS.map((o) => [o.key, () => setSkill(o.value)]))
}

export function ticketSkillLabel(skill: TicketSkillKey): string {
  return TICKET_SKILL_OPTIONS.find((o) => o.value === skill)?.label ?? skill
}

/** Skills that ship a `template.docx` under `customization/skills/<id>/`. */
export const SKILLS_WITH_DOCX = new Set<string>([KNOWLEDGE_SKILL.ticketAnswerTicket])

export function skillHasDocxTemplate(skillId: string): boolean {
  return SKILLS_WITH_DOCX.has(skillId)
}

export function isAnswerFormat(format: TicketSkillKey): boolean {
  return format === 'ticketReplyEmail' || format === 'ticketReplyLetter'
}

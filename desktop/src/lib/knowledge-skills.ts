export const KNOWLEDGE_SKILL = {
  repaymentCreatePlan: 'repayment.create-plan',
  requestReplyEmail: 'request.reply-email',
  requestReplyLetter: 'request.reply-letter',
  requestWriteNote: 'request.write-note',
  requestRewrite: 'request.rewrite',
  aboutTenant: 'about.tenant',
  aboutUnit: 'about.unit',
  aboutBuilding: 'about.building'
} as const

export const REQUEST_SKILL_KEYS = [
  'requestReplyEmail',
  'requestReplyLetter',
  'requestWriteNote',
  'requestRewrite'
] as const satisfies readonly (keyof typeof KNOWLEDGE_SKILL)[]

export const ABOUT_SKILL_KEYS = [
  'aboutTenant',
  'aboutUnit',
  'aboutBuilding'
] as const satisfies readonly (keyof typeof KNOWLEDGE_SKILL)[]

export const ABOUT_SUBJECTS = ['locataire', 'lot', 'programme'] as const

export type RequestSkillKey = (typeof REQUEST_SKILL_KEYS)[number]
export type AboutSkillKey = (typeof ABOUT_SKILL_KEYS)[number]
export type AboutSubject = (typeof ABOUT_SUBJECTS)[number]

export const REQUEST_SKILL_OPTIONS: {
  value: RequestSkillKey
  label: string
  segmentLabel: string
  key: string
}[] = [
  { value: 'requestReplyEmail', label: 'Format numérique', segmentLabel: 'Numérique', key: 'a' },
  { value: 'requestReplyLetter', label: 'Format papier', segmentLabel: 'Papier', key: 'b' },
  { value: 'requestWriteNote', label: 'Note interne', segmentLabel: 'Note interne', key: 'c' },
  { value: 'requestRewrite', label: 'Réclamation rédigée', segmentLabel: 'Réclamation', key: 'd' }
]

const REQUEST_SKILL_BY_HOTKEY: Record<string, RequestSkillKey> = Object.fromEntries(
  REQUEST_SKILL_OPTIONS.map((o) => [o.key, o.value])
) as Record<string, RequestSkillKey>

export function requestSkillFromHotkey(key: string): RequestSkillKey | undefined {
  return REQUEST_SKILL_BY_HOTKEY[key]
}

/** Keyboard shortcuts for the answer workflow format picker (form step only). */
export function requestSkillKeyActions(
  setSkill: (skill: RequestSkillKey) => void
): Record<string, () => void> {
  return Object.fromEntries(REQUEST_SKILL_OPTIONS.map((o) => [o.key, () => setSkill(o.value)]))
}

export function requestSkillLabel(skill: RequestSkillKey): string {
  return REQUEST_SKILL_OPTIONS.find((o) => o.value === skill)?.label ?? skill
}

export const ABOUT_SUBJECT_TO_SKILL: Record<AboutSubject, AboutSkillKey> = {
  locataire: 'aboutTenant',
  lot: 'aboutUnit',
  programme: 'aboutBuilding'
}

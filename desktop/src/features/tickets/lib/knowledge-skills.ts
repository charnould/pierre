import { instanceCustomization } from '@/shared/lib/instance-customization'

export const KNOWLEDGE_SKILL = {
  aboutSummary: 'about'
} as const

export const ABOUT_SUBJECTS = ['locataire', 'client', 'lot', 'batiment'] as const

export type AboutSubject = (typeof ABOUT_SUBJECTS)[number]

export type AnswerChannel = 'sms' | 'email' | 'letter'

export function skillHasDocxTemplate(skillId: string): boolean {
  return instanceCustomization().docxSkillIds.includes(skillId)
}

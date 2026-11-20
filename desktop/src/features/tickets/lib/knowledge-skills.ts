import { instanceCustomization } from '@/shared/lib/instance-customization'

export const KNOWLEDGE_SKILL = {
  aboutSummary: 'about'
} as const

export function skillHasDocxTemplate(skillId: string): boolean {
  return instanceCustomization().docxSkillIds.includes(skillId)
}

import { PROMPTS } from './prompts'

export const BUSINESS_MODULES = [
  { id: 'tickets', label: 'Traiter les réclamations' },
  { id: 'automations', label: 'Créer des automatisations' },
  { id: 'bulk', label: 'Contacter par lots' },
  { id: 'about', label: 'Obtenir une synthèse' },
  { id: 'repayment', label: 'Piloter les impayés' },
  { id: 'insurance-attestation', label: 'Renouveler les assurances' },
  { id: 'relocation', label: 'Piloter la relocation' },
  { id: 'attributions', label: 'Piloter les attributions' },
  { id: 'ventes', label: 'Piloter les ventes' }
] as const

export type BusinessModuleId = (typeof BUSINESS_MODULES)[number]['id']

export const BUSINESS_MODULE_IDS = BUSINESS_MODULES.map(({ id }) => id)

export function isBusinessModuleId(value: unknown): value is BusinessModuleId {
  return BUSINESS_MODULE_IDS.some((id) => id === value)
}

const ACTIVITY_MODULES = {
  tickets: 'tickets',
  a_qualifier: 'tickets',
  repayment: 'repayment',
  automations: 'automations',
  bulk: 'bulk'
} as const satisfies Partial<Record<string, BusinessModuleId>>

export function businessModuleForActivityContext(context: string): BusinessModuleId | null {
  return ACTIVITY_MODULES[context as keyof typeof ACTIVITY_MODULES] ?? null
}

export function businessModuleForSkillId(skillId: string): BusinessModuleId | null {
  const prompt = PROMPTS.find((item) => item.id === skillId)
  return prompt?.access ?? null
}

/** Modules whose checkbox fills exactly one knowledge database. */
export function knowledgePublishModules() {
  const ids = new Set<string>(PROMPTS.flatMap((prompt) => (prompt.publish ? [prompt.publish] : [])))
  return BUSINESS_MODULES.filter((module) => ids.has(module.id))
}

export function publishModuleForPrompt(id: string): BusinessModuleId | null {
  const prompt = PROMPTS.find((item) => item.id === id)
  return prompt?.publish ?? null
}

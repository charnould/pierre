export const PROMPTS = [
  {
    id: 'about',
    label: 'Générer une synthèse',
    access: 'about',
    publish: 'about'
  },
  {
    id: 'report',
    label: 'Générer un rapport',
    access: 'automations',
    publish: null
  },
  {
    id: 'replies',
    label: 'Répondre à une réclamation',
    access: 'tickets',
    publish: null
  },
  {
    id: 'repayment',
    label: 'Assister sur un dossier d’impayés',
    access: 'repayment',
    publish: 'repayment'
  }
] as const

export type PromptId = (typeof PROMPTS)[number]['id']

export function promptById(id: string) {
  return PROMPTS.find((prompt) => prompt.id === id) ?? null
}

export function isPromptId(id: string): id is PromptId {
  return promptById(id) !== null
}

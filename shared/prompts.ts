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
    label: 'Pré-génération de réponse',
    access: 'automations',
    publish: null
  },
  {
    id: 'repayment',
    label: "Analyse des dossiers d'impayés",
    access: 'automations',
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

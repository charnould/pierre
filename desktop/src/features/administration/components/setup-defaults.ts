const CHATBOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function chatbotJson(id: string, enabled: boolean): Record<string, unknown> {
  const parsed: Record<string, unknown> = {
    id,
    display: id === 'default' ? 'PIERRE' : id,
    community_knowledge: true,
    attachments: false,
    reasoning_effort: 'medium',
    trace: 'none',
    greetings: ['Bonjour !'],
    examples: ['Comment déposer mon préavis de congé ?'],
    disclaimer: 'Une IA peut se tromper. Vérifier les informations importantes.'
  }
  if (enabled) parsed.enabled = true
  return parsed
}

export function defaultSetupText(id: string): string {
  if (id === 'global') return pretty({ name: 'PIERRE', timezone: 'Europe/Paris' })
  if (id === 'chatbots/default') return pretty(chatbotJson('default', true))
  if (id === 'chatbots/default/AGENTS.md') return 'Consigne du chatbot.'
  if (id === 'tickets/AGENTS.md') return 'Consigne des réponses aux réclamations.'
  if (id === 'repayment/AGENTS.md') return 'Consigne d’analyse des dossiers d’impayés.'
  if (id === 'about/AGENTS.md') return 'Consigne des synthèses.'
  if (id === 'automations/AGENTS.md') {
    return 'Produire le rapport à partir des consignes de l’automatisation et des données disponibles.'
  }
  return ''
}

export function internalChatbotText(id: string): string | null {
  const trimmed = id.trim()
  if (!CHATBOT_ID.test(trimmed) || trimmed === 'default') return null
  return pretty(chatbotJson(trimmed, false))
}

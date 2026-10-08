export type SetupPiece = {
  id: string
  done: boolean
  label: string
}

function stored(texts: Record<string, string | null>, id: string): boolean {
  const value = texts[id]
  return typeof value === 'string' && value.trim().length > 0
}

function piece(id: string, done: boolean, label: string): SetupPiece {
  return { id, done, label }
}

function configuration(id: string, texts: Record<string, string | null>): SetupPiece {
  return piece(id, stored(texts, id), 'Configuration')
}

function consigne(id: string, texts: Record<string, string | null>): SetupPiece {
  return piece(id, stored(texts, id), 'Consigne')
}

function binary(id: string, binaries: readonly string[], label: string): SetupPiece {
  return piece(id, binaries.includes(id), label)
}

function repaymentTemplates(texts: Record<string, string | null>): SetupPiece[] {
  const raw = texts.repayment
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as { templates?: unknown }
    if (!Array.isArray(parsed.templates)) return []
    return parsed.templates.flatMap((name) =>
      typeof name === 'string' && name.trim()
        ? [
            piece(
              `repayment/templates/${name}`,
              stored(texts, `repayment/templates/${name}`),
              `Modèle ${name}`
            )
          ]
        : []
    )
  } catch {
    return []
  }
}

export function setupPieces(
  entry: string,
  texts: Record<string, string | null>,
  binaries: readonly string[],
  chatbotId = 'default'
): SetupPiece[] {
  if (entry === 'chatbots/default') {
    const id = chatbotId.trim() || 'default'
    if (id === 'default') {
      return [
        configuration('chatbots/default', texts),
        consigne('chatbots/default/AGENTS.md', texts),
        binary('chatbots/icons/icon.svg', binaries, 'Icône')
      ]
    }
    return [configuration(`chatbots/${id}`, texts), consigne(`chatbots/${id}/AGENTS.md`, texts)]
  }
  if (entry === 'tickets') {
    return [
      configuration('tickets', texts),
      consigne('tickets/AGENTS.md', texts),
      binary('tickets/letter.docx', binaries, 'Courrier')
    ]
  }
  if (entry === 'repayment') {
    return [
      configuration('repayment', texts),
      consigne('repayment/AGENTS.md', texts),
      binary('repayment/template.docx', binaries, 'Courrier'),
      ...repaymentTemplates(texts)
    ]
  }
  if (entry === 'about/AGENTS.md') return [consigne('about/AGENTS.md', texts)]
  if (entry === 'automations/AGENTS.md') return [consigne('automations/AGENTS.md', texts)]
  return []
}

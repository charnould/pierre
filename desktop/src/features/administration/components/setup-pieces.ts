type SetupPiece = {
  id: string
  done: boolean
  label: string
}

function stored(texts: Record<string, string | null>, id: string): boolean {
  const value = texts[id]
  return typeof value === 'string' && value.trim().length > 0
}

function piece(id: string, done: boolean, doneLabel: string, todoLabel: string): SetupPiece {
  return { id, done, label: done ? doneLabel : todoLabel }
}

function configuration(id: string, texts: Record<string, string | null>): SetupPiece {
  return piece(id, stored(texts, id), 'Configuration enregistrée', 'Enregistrer la configuration')
}

function consigne(id: string, texts: Record<string, string | null>): SetupPiece {
  return piece(id, stored(texts, id), 'Consigne enregistrée', 'Enregistrer la consigne')
}

function binary(
  id: string,
  binaries: readonly string[],
  doneLabel: string,
  todoLabel: string
): SetupPiece {
  return piece(id, binaries.includes(id), doneLabel, todoLabel)
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
              `Modèle ${name} enregistré`,
              `Enregistrer le modèle ${name}`
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
  if (entry === 'global') return [configuration('global', texts)]
  if (entry === 'email') {
    const html = texts['email/html'] ?? ''
    const gabarit = ['logo_inline_cid', 'message'].every((field) => html.includes(`{{ ${field} }}`))
    return [
      piece('email/html', gabarit, 'Gabarit enregistré', 'Enregistrer le gabarit'),
      binary('email/logo.png', binaries, 'Logo déposé', 'Déposer le logo PNG')
    ]
  }
  if (entry === 'chatbots/default') {
    const id = chatbotId.trim() || 'default'
    if (id === 'default') {
      return [
        configuration('chatbots/default', texts),
        consigne('chatbots/default/AGENTS.md', texts),
        binary('chatbots/icons/icon.svg', binaries, 'Icône SVG déposée', 'Déposer l’icône SVG')
      ]
    }
    return [configuration(`chatbots/${id}`, texts), consigne(`chatbots/${id}/AGENTS.md`, texts)]
  }
  if (entry === 'tickets') {
    return [
      configuration('tickets', texts),
      consigne('tickets/AGENTS.md', texts),
      binary(
        'tickets/letter.docx',
        binaries,
        'Modèle de courrier déposé',
        'Déposer le modèle de courrier'
      )
    ]
  }
  if (entry === 'repayment') {
    return [
      configuration('repayment', texts),
      consigne('repayment/AGENTS.md', texts),
      binary(
        'repayment/template.docx',
        binaries,
        'Modèle de document déposé',
        'Déposer le modèle de document'
      ),
      ...repaymentTemplates(texts)
    ]
  }
  if (entry === 'about/AGENTS.md') return [consigne('about/AGENTS.md', texts)]
  if (entry === 'automations/AGENTS.md') return [consigne('automations/AGENTS.md', texts)]
  return []
}

export type SetupPiece = {
  id: string
  done: boolean
  label: string
}

export const REPAYMENT_DOCUMENTS = [
  {
    id: 'repayment/plan.docx',
    fieldId: 'setup-document-plan',
    label: 'Plan d’apurement',
    description: 'Modèle Word du plan d’apurement.'
  },
  {
    id: 'repayment/protocole.docx',
    fieldId: 'setup-document-protocole',
    label: 'Protocole de cohésion sociale',
    description: 'Modèle Word du protocole de cohésion sociale.'
  },
  {
    id: 'repayment/diagnostic.docx',
    fieldId: 'setup-document-diagnostic',
    label: 'Diagnostic social et financier',
    description: 'Modèle Word du diagnostic social et financier.'
  },
  {
    id: 'repayment/courrier.docx',
    fieldId: 'setup-document-courrier',
    label: 'Courrier standard',
    description: 'Modèle Word du courrier postal du dossier.'
  }
] as const

export function recordedPhrase(label: string): string {
  if (label === 'Messages') return 'Messages, enregistrés'
  if (
    label.startsWith('Courrier') ||
    label.startsWith('Modèle ') ||
    label === 'Plan d’apurement' ||
    label === 'Protocole de cohésion sociale' ||
    label === 'Diagnostic social et financier'
  ) {
    return `${label}, enregistré`
  }
  return `${label}, enregistrée`
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
      ...REPAYMENT_DOCUMENTS.map((document) => binary(document.id, binaries, document.label)),
      piece('repayment/messages', stored(texts, 'repayment/messages'), 'Messages')
    ]
  }
  if (entry === 'about/AGENTS.md') return [consigne('about/AGENTS.md', texts)]
  if (entry === 'automations/AGENTS.md') return [consigne('automations/AGENTS.md', texts)]
  return []
}

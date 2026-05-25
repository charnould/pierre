import type { AboutSubject } from './knowledge-skills'

export const WORKFLOW_PAYLOAD_VERSION = 1 as const

export type AnswerMode = 'affaire' | 'message'

export type { AboutSubject }

export type AnswerPayload = {
  version: typeof WORKFLOW_PAYLOAD_VERSION
  workflow: 'answer'
  mode: AnswerMode
  id_request: string | null
  id_locataire: string | null
  message: string | null
  contexte: string | null
}

export type SynthesePayload = {
  version: typeof WORKFLOW_PAYLOAD_VERSION
  workflow: 'synthese'
  about_subject: AboutSubject
  identifiant: string
  year_from: number
}

export type WorkflowPayload = AnswerPayload | SynthesePayload

export function buildAnswerPayload(p: {
  mode: AnswerMode
  id_request: string
  id_locataire: string
  message: string
  contexte: string
}): AnswerPayload {
  const ctx = p.contexte.trim() || null
  if (p.mode === 'affaire') {
    return {
      version: WORKFLOW_PAYLOAD_VERSION,
      workflow: 'answer',
      mode: 'affaire',
      id_request: p.id_request.trim(),
      id_locataire: null,
      message: null,
      contexte: ctx
    }
  }
  return {
    version: WORKFLOW_PAYLOAD_VERSION,
    workflow: 'answer',
    mode: 'message',
    id_request: null,
    id_locataire: p.id_locataire.trim(),
    message: p.message.trim(),
    contexte: ctx
  }
}

export function buildSynthesePayload(p: {
  about_subject: AboutSubject
  identifiant: string
  year_from: number
}): SynthesePayload {
  return {
    version: WORKFLOW_PAYLOAD_VERSION,
    workflow: 'synthese',
    about_subject: p.about_subject,
    identifiant: p.identifiant.trim(),
    year_from: p.year_from
  }
}

export function serializeWorkflowPayload(payload: WorkflowPayload): string {
  return JSON.stringify(payload)
}

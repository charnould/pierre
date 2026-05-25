import type { AboutSubject, AnswerChannel } from '@/features/tickets/lib/knowledge-skills'

export const WORKFLOW_PAYLOAD_VERSION = 1 as const

export type { AboutSubject, AnswerChannel }

export type AnswerPayload = {
  version: typeof WORKFLOW_PAYLOAD_VERSION
  workflow: 'answer'
  channel?: AnswerChannel
  id_reclamation: string | null
  id_locataire: string | null
  message: string | null
  context: string | null
}

export type SynthesePayload = {
  version: typeof WORKFLOW_PAYLOAD_VERSION
  workflow: 'synthese'
  about_subject: AboutSubject
  identifiant: string
  year_from: number
  year_to: number
  context: string | null
}

export type WorkflowPayload = AnswerPayload | SynthesePayload

export function buildAnswerPayload(p: {
  id_reclamation: string
  id_locataire: string
  message: string
  context: string
  channel?: AnswerChannel
}): AnswerPayload {
  return {
    version: WORKFLOW_PAYLOAD_VERSION,
    workflow: 'answer',
    id_reclamation: p.id_reclamation.trim() || null,
    id_locataire: p.id_locataire.trim() || null,
    message: p.message.trim() || null,
    context: p.context.trim() || null,
    ...(p.channel ? { channel: p.channel } : {})
  }
}

export function buildSynthesePayload(p: {
  about_subject: AboutSubject
  identifiant: string
  year_from: number
  year_to: number
  context: string
}): SynthesePayload {
  return {
    version: WORKFLOW_PAYLOAD_VERSION,
    workflow: 'synthese',
    about_subject: p.about_subject,
    identifiant: p.identifiant.trim(),
    year_from: p.year_from,
    year_to: p.year_to,
    context: p.context.trim() || null
  }
}

export function serializeWorkflowPayload(payload: WorkflowPayload): string {
  return JSON.stringify(payload)
}

import type { AboutSubject } from '@/features/tickets/lib/knowledge-skills'

type SyntheseBase = {
  year_from: number
  year_to: number
  context?: string
}

export type SynthesePayload = SyntheseBase &
  ({ id_locataire: string } | { id_client: string } | { id_lot: string } | { id_batiment: string })

export function buildSynthesePayload(p: {
  about_subject: AboutSubject
  identifiant: string
  year_from: number
  year_to: number
  context: string
}): SynthesePayload {
  const context = p.context.trim()
  const id = p.identifiant.trim()
  const base = {
    year_from: p.year_from,
    year_to: p.year_to,
    ...(context ? { context } : {})
  }
  switch (p.about_subject) {
    case 'locataire':
      return { ...base, id_locataire: id }
    case 'client':
      return { ...base, id_client: id }
    case 'lot':
      return { ...base, id_lot: id }
    case 'batiment':
      return { ...base, id_batiment: id }
  }
}

export function serializeWorkflowPayload(payload: SynthesePayload): string {
  return JSON.stringify(payload)
}

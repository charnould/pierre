import {
  COMMUNICATION_TYPES,
  activity_payload,
  type Activite,
  type CommunicationType
} from '@/shared/types/activites'

import type { TodoSentencePart } from './repayment-action-activity'

export type TimelineMessageBody =
  | { kind: 'note'; text: string }
  | { kind: 'rcs'; text: string; choices: string[] }
  | {
      kind: 'email'
      medium: Exclude<CommunicationType, 'rcs'>
      subject: string | null
      body: string
      from?: string | null
      to?: string | null
      sentAt?: string | null
    }

function stringMeta(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseEmailBody(
  row: Activite,
  medium: Exclude<CommunicationType, 'rcs'>
): TimelineMessageBody | null {
  const payload = activity_payload(row.type, row.contenu)
  const contenu = stringMeta(payload['corps']) ?? stringMeta(payload['contenu'])
  const objet = stringMeta(payload['objet'])
  const from = stringMeta(payload['expediteur'])
  const to = stringMeta(payload['destinataire'])
  const sentAtRaw = stringMeta(payload['date_envoi'])
  const sentAt = sentAtRaw && !Number.isNaN(Date.parse(sentAtRaw)) ? sentAtRaw.trim() : null
  const parties =
    from || to || sentAt
      ? {
          ...(from ? { from: from.trim() } : {}),
          ...(to ? { to: to.trim() } : {}),
          ...(sentAt ? { sentAt } : {})
        }
      : {}

  if (contenu != null) {
    return {
      kind: 'email',
      medium,
      subject: objet != null ? objet.trim() || null : null,
      body: contenu,
      ...parties
    }
  }

  if (objet != null && objet.trim()) {
    return { kind: 'email', medium, subject: objet.trim(), body: '', ...parties }
  }

  return null
}

const COMMUNICATION_TYPE_SET = new Set<string>(COMMUNICATION_TYPES)

/** Libellé d’action porté par un envoi (frontmatter `action`). */
export function parseTimelineOutboundAction(row: Activite): string | null {
  if (!COMMUNICATION_TYPE_SET.has(row.type)) return null
  const payload = activity_payload(row.type, row.contenu)
  const action = typeof payload['action'] === 'string' ? payload['action'].trim() : ''
  return action || null
}

/** Médium de l’envoi — `type` d’activité (`email`, `rcs`, …). `mailto` n’est pas un type. */
export function outboundChannelPhrase(type: Activite['type']): string | null {
  if (type === 'email') return 'par e-mail'
  if (type === 'rcs') return 'par RCS'
  if (type === 'sms') return 'par SMS'
  if (type === 'courrier') return 'par courrier'
  if (type === 'lrar') return 'par lettre recommandée'
  if (type === 'lre') return 'par lettre recommandée électronique'
  if (type === 'signature') return 'par signature électronique'
  return null
}

/** Phrase L2 d’un envoi : « a [action] par … [(via un traitement de masse)] ». */
export function outboundActionSentenceParts(
  action: string | null,
  type: Activite['type'],
  bulkId?: string | null
): TodoSentencePart[] {
  const medium = outboundChannelPhrase(type)
  return [
    { type: 'text', text: 'a' },
    ...(action ? [{ type: 'title' as const, text: action }] : []),
    ...(medium ? [{ type: 'text' as const, text: medium }] : []),
    ...(bulkId ? [{ type: 'text' as const, text: '(via un traitement de masse)' }] : [])
  ]
}

export function parseTimelineMessageBody(row: Activite): TimelineMessageBody | null {
  if (row.type === 'repayment_phase_change' || row.type === 'repayment_assignment') return null
  if (row.type === 'repayment_tag_change') return null

  const payload = activity_payload(row.type, row.contenu)

  if (row.type === 'note' || row.type === 'ticket_memo' || row.type === 'ticket_summary') {
    const text =
      stringMeta(payload['note']) ?? stringMeta(payload['contenu']) ?? stringMeta(payload['titre'])
    return text ? { kind: 'note', text } : null
  }

  if (row.type === 'rcs') {
    const text = stringMeta(payload['corps']) ?? stringMeta(payload['contenu'])
    const choices = Array.isArray(payload['choix'])
      ? payload['choix'].flatMap((choice) => {
          if (typeof choice === 'string') return [choice]
          if (choice == null || typeof choice !== 'object' || Array.isArray(choice)) return []
          const label = (choice as Record<string, unknown>)['label']
          return typeof label === 'string' ? [label] : []
        })
      : []
    return text ? { kind: 'rcs', text, choices } : null
  }

  if (
    row.type === 'email' ||
    row.type === 'sms' ||
    row.type === 'courrier' ||
    row.type === 'lrar' ||
    row.type === 'lre' ||
    row.type === 'signature'
  ) {
    return parseEmailBody(row, row.type)
  }

  if (row.type === 'email_import') {
    return parseEmailBody(row, 'email')
  }

  const fallback =
    stringMeta(payload['note']) ??
    stringMeta(payload['corps']) ??
    stringMeta(payload['contenu']) ??
    stringMeta(payload['titre'])
  return fallback ? { kind: 'note', text: fallback } : null
}

export function formatTimelineMessageBodyPlain(row: Activite): string | null {
  const parsed = parseTimelineMessageBody(row)
  if (!parsed) return null

  switch (parsed.kind) {
    case 'note':
    case 'rcs':
      return parsed.text
    case 'email':
      if (parsed.subject) return `Objet : ${parsed.subject}\n\n${parsed.body}`
      return parsed.body
  }
}

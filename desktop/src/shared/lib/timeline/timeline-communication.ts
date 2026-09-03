import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import {
  is_communication_opened_type,
  parse_communication_opened_content,
  parse_communication_status_content,
  type Activite,
  type CommunicationChannel
} from '@/shared/types/activites'

import {
  isNotificationDeliveryStatus,
  notificationDeliveryStatusLabel
} from '../../../../../shared/notification-delivery'

export const TIMELINE_COMMUNICATION_PREVIEW_LIMIT = 240

type TimelineCommunicationDirection = 'inbound' | 'outbound' | 'unknown'

export type TimelineCommunication = {
  channel: CommunicationChannel
  direction: TimelineCommunicationDirection
  imported: boolean
  action: string | null
  subject: string | null
  subjectLabel: 'Objet' | 'Document'
  body: string
  choices: string[]
  from: string | null
  to: string | null
  sentAt: string | null
  statusLine: string | null
  statusFailed: boolean
}

export function isTimelineCommunicationType(type: string): boolean {
  return is_communication_opened_type(type)
}

export function parseTimelineCommunication(
  row: Activite,
  statuses: Activite[] = []
): TimelineCommunication | null {
  if (!is_communication_opened_type(row.type) || !row.channel) return null
  const payload = parse_communication_opened_content(row.contenu)
  if (!payload) return null
  const imported = row.type === 'communication.imported'
  const inbound = /^(tenant|candidate|external):/.test(row.auteur)
  const latest = statuses.at(-1)
  const status = latest ? parse_communication_status_content(latest.contenu) : null
  let statusLine: string | null = null
  let statusFailed = false
  if (latest?.type === 'communication.ok') {
    statusLine = status?.result === 'read' ? 'Réussi · Lu' : 'Réussi · Livré'
  } else if (latest?.type === 'communication.failed') {
    statusLine =
      status?.reason && isNotificationDeliveryStatus(status.reason)
        ? `Échoué · ${notificationDeliveryStatusLabel(status.reason)}`
        : 'Échoué'
    statusFailed = true
  }

  return {
    channel: row.channel,
    direction: imported ? 'unknown' : inbound ? 'inbound' : 'outbound',
    imported,
    action: payload.action ?? null,
    subject: row.channel === 'rcs' || row.channel === 'sms' ? null : (payload.subject ?? null),
    subjectLabel: row.channel === 'email' ? 'Objet' : 'Document',
    body: payload.body,
    choices: payload.choices?.map((choice) => choice.label) ?? [],
    from: payload.sender || senderFromAuthor(row.auteur),
    to: imported ? null : inbound ? null : (row.destinataire ?? null),
    sentAt: imported ? null : null,
    statusLine,
    statusFailed
  }
}

export function formatTimelineCommunicationPlain(row: Activite): string | null {
  const parsed = parseTimelineCommunication(row)
  if (!parsed) return null
  if (parsed.subject) return `Objet : ${parsed.subject}\n\n${parsed.body}`
  return parsed.body || null
}

export function displayTimelineCommunicationBody(body: string, subject: string | null): string {
  if (!subject) return body
  const lines = body.split(/\r?\n/)
  const first = lines[0]?.trim() ?? ''
  const sameSubject = first === `Objet : ${subject}` || first === `Objet:${subject}`
  const bare = first === 'Objet :' || first === 'Objet:'
  if (!sameSubject && !bare) return body
  let index = 1
  while (index < lines.length && lines[index]!.trim() === '') index += 1
  return lines.slice(index).join('\n')
}

export function communicationBodyParagraphs(body: string): string[] {
  return body
    .split(/\n\n+/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

export function previewTimelineCommunicationParagraphs(paragraphs: string[]): {
  paragraphs: string[]
  truncated: boolean
} {
  const total = paragraphs.reduce((sum, paragraph) => sum + charLength(paragraph), 0)
  if (total <= TIMELINE_COMMUNICATION_PREVIEW_LIMIT) {
    return { paragraphs, truncated: false }
  }

  const kept: string[] = []
  let used = 0
  for (const paragraph of paragraphs) {
    const length = charLength(paragraph)
    if (kept.length > 0 && used + length > TIMELINE_COMMUNICATION_PREVIEW_LIMIT) {
      return { paragraphs: kept, truncated: true }
    }
    if (length > TIMELINE_COMMUNICATION_PREVIEW_LIMIT) {
      return { paragraphs: [cutAtWord(paragraph)], truncated: true }
    }
    kept.push(paragraph)
    used += length
  }
  return { paragraphs: kept, truncated: true }
}

export function previewTimelineCommunicationBody(body: string): {
  text: string
  truncated: boolean
} {
  const preview = previewTimelineCommunicationParagraphs(communicationBodyParagraphs(body))
  return { text: preview.paragraphs.join('\n\n'), truncated: preview.truncated }
}

function charLength(text: string): number {
  return Array.from(text).length
}

function cutAtWord(text: string): string {
  const window = Array.from(text).slice(0, TIMELINE_COMMUNICATION_PREVIEW_LIMIT)
  let end = 0
  for (let index = window.length - 1; index >= 0; index--) {
    if (/\s/u.test(window[index]!)) {
      end = index
      break
    }
  }
  if (end === 0) end = window.length
  while (end > 0 && /\s/u.test(window[end - 1]!)) end -= 1
  if (end === 0) end = window.length
  return window.slice(0, end).join('')
}

function senderFromAuthor(auteur: string): string | null {
  const author = parseActivityAuthor(auteur)
  const value = author.id.trim() || author.label.trim()
  return value || null
}

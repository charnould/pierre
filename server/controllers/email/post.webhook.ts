import type { Context } from 'hono'

import {
  ACTIVITY_CONTENT_VERSION,
  parse_communication_opened_content
} from '../../../shared/activites'
import { parse_rattachement } from '../../utils/activities/rows'
import { communication_from_reference } from '../../utils/communications/parsing'
import { create_inbound, create_unmatched_inbound } from '../../utils/communications/storage'
import { normalize_email } from '../../utils/contacts'
import { update_status } from '../../utils/delivery-status'
import { cm_signature_valid } from '../../utils/email/cm'

const MAX_BYTES = 32_000_000

const as_string = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const email_of = (value: string): string => {
  const wrapped = value.match(/<([^>]+)>/)
  return (wrapped?.[1] ?? value).trim()
}

const domain_of = (value: string): string => {
  const email = email_of(value).toLowerCase()
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1)
}

const text_of_html = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()

const statut_of = (
  type: string,
  bounceType: string
): 'sent' | 'delivered' | 'opened' | 'failed' | null => {
  if (type === 'sent') return 'sent'
  if (type === 'delivered') return 'delivered'
  if (type === 'opened') return 'opened'
  if (type === 'failed' || type === 'suppressed') return 'failed'
  if (type === 'bounced') return bounceType === 'Soft Bounce' ? null : 'failed'
  return null
}

const reason_of = (data: Record<string, unknown>, type: string): string => {
  const bounce = data['bounce']
  if (bounce != null && typeof bounce === 'object' && !Array.isArray(bounce)) {
    const message = as_string((bounce as Record<string, unknown>)['message'])
    if (message) return message.slice(0, 300)
  }
  const message = as_string(data['message'])
  if (message) return message.slice(0, 300)
  const failed = data['failed']
  if (failed != null && typeof failed === 'object' && !Array.isArray(failed)) {
    const messages = (failed as Record<string, unknown>)['messages']
    if (Array.isArray(messages)) {
      const text = messages.map(as_string).filter(Boolean).join(' ')
      if (text) return text.slice(0, 300)
    }
  }
  const suppressed = data['suppressed']
  if (suppressed != null && typeof suppressed === 'object' && !Array.isArray(suppressed)) {
    const text = as_string((suppressed as Record<string, unknown>)['message'])
    if (text) return text.slice(0, 300)
  }
  return type
}

const header_value = (body: Record<string, unknown>, name: string): string => {
  if (!Array.isArray(body['headers'])) return ''
  for (const header of body['headers']) {
    if (!header || typeof header !== 'object' || Array.isArray(header)) continue
    const record = header as Record<string, unknown>
    const key = as_string(record['Name'] ?? record['name'])
    if (key.toLowerCase() !== name) continue
    return as_string(record['Value'] ?? record['value'])
  }
  return ''
}

const message_references_in = (value: string): string[] => {
  const trimmed = value.trim()
  if (!trimmed) return []
  const bracketed = [...trimmed.matchAll(/<([^>]+)>/g)].map((match) => match[1]!.trim())
  const bare = trimmed.replace(/^<|>$/g, '')
  const uuids = [
    ...trimmed
      .toLowerCase()
      .matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)
  ].map((match) => match[0])
  return [...new Set([...bracketed, bare, ...uuids].filter(Boolean))]
}

const receive = (
  body: Record<string, unknown>,
  occurredAt: string,
  idempotencyKey: string,
  messageId: string
): boolean => {
  const domain = Bun.env['CM_EMAIL_DOMAIN']?.trim().toLowerCase() ?? ''
  if (!domain) return false
  const recipient = as_string(body['originalRecipient']) || as_string(body['to'])
  if (domain_of(recipient) !== domain) return true
  const sender = normalize_email(email_of(as_string(body['from'])))
  if (sender.status === 'invalid') return true
  const references = Array.isArray(body['references']) ? body['references'] : []
  const echoes = [
    ...new Set(
      [
        as_string(body['inReplyTo']),
        ...references.map(as_string),
        header_value(body, 'in-reply-to'),
        header_value(body, 'references')
      ].flatMap(message_references_in)
    )
  ]
  const subject = as_string(body['subject'])
  const text = as_string(body['textBody']) || text_of_html(as_string(body['htmlBody']))
  const contenu = JSON.stringify({
    version: ACTIVITY_CONTENT_VERSION,
    sender: sender.value,
    ...(subject ? { subject } : {}),
    body: text
  })
  for (const echo of echoes) {
    const activity = communication_from_reference(echo)
    const attachment = activity ? parse_rattachement(activity.rattachement) : null
    const content = activity ? parse_communication_opened_content(activity.contenu) : null
    if (
      activity?.channel === 'email' &&
      (activity.destinataire === sender.value || content?.sender === sender.value) &&
      activity.thread_id &&
      attachment
    ) {
      create_inbound({
        contexte: attachment.contexte,
        ref: attachment.ref,
        type: 'email',
        auteur: activity.id_locataire
          ? `tenant:${activity.id_locataire}`
          : `external:${sender.value}`,
        contenu,
        occurred_at: occurredAt,
        thread_id: activity.thread_id,
        idempotency_key: idempotencyKey,
        ...(messageId ? { id_externe: messageId } : {})
      })
      return true
    }
  }
  create_unmatched_inbound({
    type: 'email',
    auteur: `external:${sender.value}`,
    contenu,
    occurred_at: occurredAt,
    idempotency_key: idempotencyKey,
    ...(messageId ? { id_externe: messageId } : {})
  })
  return true
}

const track = (body: Record<string, unknown>, occurredAt: string) => {
  const data =
    body['data'] != null && typeof body['data'] === 'object' && !Array.isArray(body['data'])
      ? (body['data'] as Record<string, unknown>)
      : null
  if (!data) return
  const type = as_string(body['type'])
  const bounce = data['bounce']
  const bounceType =
    bounce != null && typeof bounce === 'object' && !Array.isArray(bounce)
      ? as_string((bounce as Record<string, unknown>)['type'])
      : ''
  const statut = statut_of(type, bounceType)
  if (!statut) return
  const activity = communication_from_reference(as_string(data['customerReference']))
  if (!activity || activity.channel !== 'email') return
  const eventId = as_string(data['id'])
  update_status({
    activity_id: activity.id,
    type: 'email',
    statut,
    reason: statut === 'failed' ? reason_of(data, type) : undefined,
    occurred_at: occurredAt,
    ...(as_string(body['messageId'])
      ? { id_externe: as_string(body['messageId']).toLowerCase() }
      : {}),
    ...(eventId ? { idempotency_key: `cm:${eventId}` } : {})
  })
}

export const controller = async (c: Context) => {
  const declared = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BYTES) return c.body(null, 406)
  const raw = new Uint8Array(await c.req.arrayBuffer())
  if (raw.byteLength > MAX_BYTES) return c.body(null, 406)
  const id = c.req.header('svix-id') ?? ''
  const timestamp = c.req.header('svix-timestamp') ?? ''
  const signature = c.req.header('svix-signature') ?? ''
  if (!(await cm_signature_valid(id, timestamp, signature, raw))) {
    return c.json({ error: { code: 'unauthorized', message: 'Signature webhook invalide' } }, 401)
  }
  let body: Record<string, unknown>
  try {
    body = JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
  }
  const dated = new Date(as_string(body['date']) || as_string(body['createdAt']))
  const occurredAt = Number.isNaN(dated.getTime())
    ? new Date(Number(timestamp)).toISOString()
    : dated.toISOString()
  if (as_string(body['type']) === 'Inbound') {
    const messageId =
      as_string(c.req.header('cm-message-id')) || as_string(body['messageId']).replace(/^<|>$/g, '')
    if (!receive(body, occurredAt, `cm:inbound:${id}`, messageId)) {
      return c.json({ error: { code: 'not_configured', message: 'CM_EMAIL_DOMAIN manquant' } }, 503)
    }
  } else {
    track(body, occurredAt)
  }
  return c.body(null, 200)
}

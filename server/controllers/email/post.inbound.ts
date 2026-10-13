import type { Context } from 'hono'

import { ACTIVITY_CONTENT_VERSION } from '../../../shared/activites'
import { parse_rattachement } from '../../utils/activities/rows'
import {
  activity_references_in,
  communication_from_reference
} from '../../utils/communications/parsing'
import { create_inbound, create_unmatched_inbound } from '../../utils/communications/storage'
import { normalize_email } from '../../utils/contacts'
import { mailgun_signature_valid } from '../../utils/email/mailgun'

const MAX_BYTES = 26_000_000

const text_field = (form: Record<string, unknown>, key: string): string => {
  const value = form[key]
  return typeof value === 'string' ? value.trim() : ''
}

const email_of = (value: string): string => {
  const wrapped = value.match(/<([^>]+)>/)
  return (wrapped?.[1] ?? value).trim()
}

const header_value = (form: Record<string, unknown>, name: string): string => {
  const raw = text_field(form, 'message-headers')
  if (!raw) return ''
  try {
    const headers = JSON.parse(raw) as unknown
    if (!Array.isArray(headers)) return ''
    for (const pair of headers) {
      if (!Array.isArray(pair) || pair.length < 2) continue
      if (String(pair[0]).toLowerCase() === name) return String(pair[1]).trim()
    }
  } catch {
    return ''
  }
  return ''
}

const message_id = (form: Record<string, unknown>): string =>
  text_field(form, 'Message-Id') || header_value(form, 'message-id')

const replied_activity = (form: Record<string, unknown>, sender: string) => {
  const ids = [
    ...activity_references_in(header_value(form, 'in-reply-to')),
    ...activity_references_in(header_value(form, 'references')).reverse()
  ]
  for (const id of ids) {
    const activity = communication_from_reference(id)
    const attachment = activity ? parse_rattachement(activity.rattachement) : null
    if (
      activity?.channel === 'email' &&
      activity.destinataire === sender &&
      activity.thread_id &&
      attachment
    ) {
      return { activity, attachment, threadId: activity.thread_id }
    }
  }
  return null
}

const idempotency_key = (messageId: string, fingerprint: string): string => {
  if (messageId) return `mailgun:inbound:${messageId}`
  return `mailgun:inbound:${new Bun.CryptoHasher('sha256').update(fingerprint).digest('hex')}`
}

export const controller = async (c: Context) => {
  const declared = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BYTES) return c.body(null, 406)
  let form: Record<string, unknown>
  try {
    form = (await c.req.parseBody()) as Record<string, unknown>
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Formulaire requis' } }, 400)
  }
  const timestamp = text_field(form, 'timestamp')
  const token = text_field(form, 'token')
  const signature = text_field(form, 'signature')
  if (!(await mailgun_signature_valid(timestamp, token, signature))) {
    return c.json({ error: { code: 'unauthorized', message: 'Signature webhook invalide' } }, 401)
  }

  const sender = normalize_email(email_of(text_field(form, 'sender') || text_field(form, 'from')))
  const occurred = new Date(Number(timestamp) * 1000)
  if (sender.status === 'invalid' || Number.isNaN(occurred.getTime())) return c.body(null, 406)
  const subject = text_field(form, 'subject')
  const body = text_field(form, 'stripped-text') || text_field(form, 'body-plain')
  const contenu = JSON.stringify({
    version: ACTIVITY_CONTENT_VERSION,
    sender: sender.value,
    ...(subject ? { subject } : {}),
    body
  })
  const key = idempotency_key(
    message_id(form),
    `${sender.value}\0${timestamp}\0${subject}\0${body}`
  )
  const replied = replied_activity(form, sender.value)
  if (replied) {
    create_inbound({
      contexte: replied.attachment.contexte,
      ref: replied.attachment.ref,
      type: 'email',
      auteur: replied.activity.id_locataire
        ? `tenant:${replied.activity.id_locataire}`
        : `external:${sender.value}`,
      contenu,
      occurred_at: occurred.toISOString(),
      thread_id: replied.threadId,
      idempotency_key: key
    })
    return c.body(null, 200)
  }

  create_unmatched_inbound({
    type: 'email',
    auteur: `external:${sender.value}`,
    contenu,
    occurred_at: occurred.toISOString(),
    idempotency_key: key
  })
  return c.body(null, 200)
}

import type { Context } from 'hono'

import { ACTIVITY_CONTENT_VERSION } from '../../../shared/activites'
import { parse_rattachement } from '../../utils/activities/rows'
import { handle_rich_rcs_reply } from '../../utils/bulk/rich-rcs'
import { update_status } from '../../utils/bulk/status'
import {
  cm_webhook_authorized,
  communication_from_reference,
  find_recent_thread
} from '../../utils/communications/parsing'
import {
  CommunicationsError,
  create_inbound,
  create_unmatched_inbound
} from '../../utils/communications/storage'
import { normalize_telephone } from '../../utils/contacts'

class WebhookValidationError extends Error {}

const objects = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === 'object' && !Array.isArray(item)
    )
  }
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? [value as Record<string, unknown>]
    : []
}

const payloads = (raw: unknown): Record<string, unknown>[] => {
  const root = objects(raw)
  if (root.length !== 1) return root
  const messages = root[0]?.['messages']
  if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
    return objects((messages as Record<string, unknown>)['msg'])
  }
  return root
}

const string_at = (value: unknown, ...path: string[]): string | null => {
  let current = value
  for (const key of path) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) return null
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' && current.trim() ? current.trim() : null
}

const number_at = (value: unknown, ...path: string[]): number | null => {
  let current = value
  for (const key of path) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) return null
    current = (current as Record<string, unknown>)[key]
  }
  const number = typeof current === 'number' ? current : Number(current)
  return Number.isFinite(number) ? number : null
}

const inbound_idempotency_key = (
  payload: Record<string, unknown>,
  phone: string,
  occurred_at: string,
  content: string,
  context_reference: string | null
): string => {
  const providerEventId =
    string_at(payload, 'messageId') ??
    string_at(payload, 'message', 'id') ??
    string_at(payload, 'event', 'id') ??
    string_at(payload, 'id')
  const identity = providerEventId
    ? `event:${providerEventId}`
    : `fingerprint:${phone}\0${occurred_at}\0${content}\0${context_reference ?? ''}`
  return `cm:inbound:${new Bun.CryptoHasher('sha256').update(identity).digest('hex')}`
}

const content_from = (
  payload: Record<string, unknown>,
  source: ReturnType<typeof communication_from_reference>
): string | null => {
  const text = string_at(payload, 'message', 'text')
  if (text) return text
  const label = string_at(payload, 'event', 'custom', 'label')
  const postback = string_at(payload, 'event', 'custom', 'postbackdata')
  let configuredLabel: string | null = null
  if (postback && source) {
    try {
      const content = JSON.parse(source.contenu) as { choix?: unknown }
      if (Array.isArray(content.choix)) {
        const match = content.choix.find(
          (choice) =>
            choice != null &&
            typeof choice === 'object' &&
            !Array.isArray(choice) &&
            (choice as Record<string, unknown>)['id'] === postback
        ) as Record<string, unknown> | undefined
        configuredLabel = typeof match?.['label'] === 'string' ? match['label'] : null
      }
    } catch {
      configuredLabel = null
    }
  }
  const choice = label ?? configuredLabel ?? postback
  return choice ? `Le locataire a choisi « ${choice} ».` : null
}

const status_from_cm = (code: number): 'sent' | 'delivered' | 'read' | 'failed' | null => {
  if (code === 0) return 'sent'
  if (code === 1 || code === 3) return 'failed'
  if (code === 2) return 'delivered'
  if (code === 4) return 'read'
  return null
}

const handle_status = (payload: Record<string, unknown>): void => {
  const reference = string_at(payload, 'reference')
  const code = number_at(payload, 'status', 'code')
  if (!reference || code == null) throw new WebhookValidationError('Statut webhook incomplet')
  const activity = communication_from_reference(reference)
  const statut = status_from_cm(code)
  if (!statut) throw new WebhookValidationError('Statut webhook inconnu')
  if (!activity || activity.type !== 'rcs') {
    throw new WebhookValidationError('Référence de communication invalide')
  }
  const occurredAt = string_at(payload, 'received') ?? string_at(payload, 'timeUtc')
  if (!occurredAt || Number.isNaN(new Date(occurredAt).getTime())) {
    throw new WebhookValidationError('Horodatage webhook invalide')
  }
  update_status({
    activity_id: activity.id,
    type: 'rcs',
    statut,
    occurred_at: occurredAt
  })
}

const handle_inbound = (payload: Record<string, unknown>): void => {
  const rawPhone = string_at(payload, 'from', 'number')
  if (!rawPhone) throw new WebhookValidationError('Expéditeur manquant')
  const phone = normalize_telephone(rawPhone)
  if (phone.status === 'invalid') throw new WebhookValidationError('Expéditeur invalide')
  const occurredAt = string_at(payload, 'timeUtc')
  if (!occurredAt || Number.isNaN(new Date(occurredAt).getTime())) {
    throw new WebhookValidationError('Horodatage webhook invalide')
  }
  const contextReference = string_at(payload, 'messageContext')
  const source = contextReference ? communication_from_reference(contextReference) : null
  const content = content_from(payload, source)
  if (!content) throw new WebhookValidationError('Contenu webhook manquant')
  const idempotencyKey = inbound_idempotency_key(
    payload,
    phone.value,
    occurredAt,
    content,
    contextReference
  )
  const exact =
    source?.type === 'rcs' &&
    source.destinataire === phone.value &&
    parse_rattachement(source.rattachement)
      ? source
      : null

  if (exact) {
    const attachment = parse_rattachement(exact.rattachement)!
    const inbound = create_inbound({
      contexte: attachment.contexte,
      ref: attachment.ref,
      type: 'rcs',
      auteur: exact.id_locataire ? `tenant:${exact.id_locataire}` : `external:${phone.value}`,
      contenu: JSON.stringify({ version: ACTIVITY_CONTENT_VERSION, corps: content }),
      occurred_at: occurredAt,
      thread_id: exact.thread_id ?? undefined,
      idempotency_key: idempotencyKey
    })
    if (exact.bulk_id && exact.execution_id) {
      handle_rich_rcs_reply(exact, inbound, payload)
    }
    return
  }

  const recent = find_recent_thread('rcs', phone.value, new Date(occurredAt))
  if (recent) {
    create_inbound({
      contexte: recent.contexte,
      ref: recent.ref,
      type: 'rcs',
      auteur: recent.id_locataire ? `tenant:${recent.id_locataire}` : `external:${phone.value}`,
      contenu: JSON.stringify({ version: ACTIVITY_CONTENT_VERSION, corps: content }),
      occurred_at: occurredAt,
      thread_id: recent.thread_id,
      idempotency_key: idempotencyKey
    })
    return
  }

  create_unmatched_inbound({
    type: 'rcs',
    auteur: `external:${phone.value}`,
    contenu: JSON.stringify({ version: ACTIVITY_CONTENT_VERSION, corps: content }),
    occurred_at: occurredAt,
    idempotency_key: idempotencyKey
  })
}

export const controller = async (c: Context) => {
  if (!cm_webhook_authorized(c.req.header('Webhook-Secret'))) {
    return c.json({ error: { code: 'unauthorized', message: 'Webhook key invalide' } }, 401)
  }
  const declaredLength = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > 256_000) {
    return c.json({ error: { code: 'payload_too_large', message: 'Webhook trop volumineux' } }, 413)
  }
  const text = await c.req.text()
  if (text.length > 256_000) {
    return c.json({ error: { code: 'payload_too_large', message: 'Webhook trop volumineux' } }, 413)
  }
  let raw: unknown
  try {
    raw = text ? JSON.parse(text) : null
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
  }
  try {
    const parsedPayloads = payloads(raw)
    if (parsedPayloads.length === 0) {
      throw new WebhookValidationError('Webhook vide')
    }
    for (const payload of parsedPayloads) {
      if (number_at(payload, 'status', 'code') != null) handle_status(payload)
      else handle_inbound(payload)
    }
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      return c.json({ error: { code: 'invalid_webhook', message: error.message } }, 400)
    }
    if (error instanceof CommunicationsError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[post.webhook.rcs]', error)
    return c.json(
      { error: { code: 'processing_failed', message: 'Webhook processing failed' } },
      500
    )
  }
  return c.body(null, 200)
}

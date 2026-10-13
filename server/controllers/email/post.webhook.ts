import type { Context } from 'hono'

import {
  activity_references_in,
  communication_from_reference
} from '../../utils/communications/parsing'
import { update_status } from '../../utils/delivery-status'
import { mailgun_signature_valid } from '../../utils/email/mailgun'

const email_status = (event: string): 'sent' | 'delivered' | 'read' | 'failed' | null => {
  if (event === 'accepted') return 'sent'
  if (event === 'delivered') return 'delivered'
  if (event === 'opened') return 'read'
  if (event === 'permanent_fail' || event === 'failed') return 'failed'
  return null
}

const as_string = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

const failure_reason = (data: Record<string, unknown>, event: string): string => {
  const delivery = data['delivery-status']
  if (delivery != null && typeof delivery === 'object' && !Array.isArray(delivery)) {
    const message = as_string((delivery as Record<string, unknown>)['message'])
    if (message) return message.slice(0, 300)
  }
  const reason = as_string(data['reason'])
  return reason || event
}

const event_instant = (value: unknown, fallbackSeconds: string): string => {
  const seconds = typeof value === 'number' ? value : Number(value)
  const unix = Number.isFinite(seconds) ? seconds : Number(fallbackSeconds)
  return new Date(unix * 1000).toISOString()
}

export const controller = async (c: Context) => {
  const declared = Number(c.req.header('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > 256_000) return c.body(null, 406)
  const body = await c.req.text()
  if (body.length > 256_000) return c.body(null, 406)

  let event: {
    signature?: { timestamp?: unknown; token?: unknown; signature?: unknown }
    'event-data'?: Record<string, unknown>
  }
  try {
    event = JSON.parse(body) as typeof event
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
  }
  const signature = event.signature
  const timestamp = as_string(signature?.timestamp)
  const token = as_string(signature?.token)
  const digest = as_string(signature?.signature)
  if (!(await mailgun_signature_valid(timestamp, token, digest))) {
    return c.json({ error: { code: 'unauthorized', message: 'Signature webhook invalide' } }, 401)
  }

  const data = event['event-data']
  const type = as_string(data?.['event'])
  const statut = email_status(type)
  const message = data?.['message']
  const headers =
    message != null && typeof message === 'object' && !Array.isArray(message)
      ? (message as Record<string, unknown>)['headers']
      : null
  const messageId =
    headers != null && typeof headers === 'object' && !Array.isArray(headers)
      ? as_string((headers as Record<string, unknown>)['message-id'])
      : ''
  const reference = activity_references_in(messageId)[0] ?? ''
  if (!data || !statut || !reference) return c.body(null, 200)
  const activity = communication_from_reference(reference)
  if (!activity || activity.channel !== 'email') return c.body(null, 200)
  const eventId = as_string(data['id']) || token
  update_status({
    activity_id: activity.id,
    type: 'email',
    statut,
    reason: statut === 'failed' ? failure_reason(data, type) : undefined,
    occurred_at: event_instant(data['timestamp'], timestamp),
    idempotency_key: `mailgun:${eventId}:${type}`
  })
  return c.body(null, 200)
}

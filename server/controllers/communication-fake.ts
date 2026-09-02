import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS, ACTIVITY_CONTENT_VERSION } from '../../shared/activites'
import type { CommunicationType } from '../../shared/activites'
import type { Parsed_User } from '../utils/_schema'
import {
  cm_webhook_authorized,
  find_recent_thread,
  next_status_timestamp
} from '../utils/communications/parsing'
import { is_communication_status, update_status } from '../utils/communications/status'
import {
  CommunicationsError,
  create_inbound,
  create_outbound,
  create_unmatched_inbound
} from '../utils/communications/storage'
import { normalize_email } from '../utils/contacts'

const Body = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1),
    contenu: z
      .object({
        objet: z.string().trim().min(1).optional(),
        corps: z.string().trim().min(1),
        action: z.string().trim().min(1).optional()
      })
      .strict()
  })
  .strict()

const StatusWebhook = z
  .object({
    activityId: z.number().int().positive(),
    status: z.string().trim().min(1),
    occurredAt: z.iso.datetime()
  })
  .strict()

const MessageWebhook = z
  .object({
    from: z.string().trim().min(1),
    content: z.string().trim().min(1),
    occurredAt: z.iso.datetime()
  })
  .strict()

const error_status = (error: CommunicationsError): 400 | 403 | 404 | 409 =>
  error.code === 'forbidden'
    ? 403
    : error.code === 'not_found'
      ? 404
      : error.code === 'conflict'
        ? 409
        : 400

export const fake_communication_controller =
  (type: Exclude<CommunicationType, 'rcs'>) => async (c: Context) => {
    const user = c.get('user') as Parsed_User | null
    if (!user?.email) {
      return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
    }
    if (Bun.env['NODE_ENV'] === 'production') {
      return c.json(
        {
          error: {
            code: 'provider_not_configured',
            message: `Aucun prestataire ${type} n'est configuré`
          }
        },
        501
      )
    }
    const idempotencyKey = c.req.header('Idempotency-Key')?.trim() ?? ''
    if (!z.uuid().safeParse(idempotencyKey).success) {
      return c.json(
        { error: { code: 'invalid_idempotency_key', message: 'Idempotency-Key UUID requis' } },
        400
      )
    }
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
    }
    const parsed = Body.safeParse(body)
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'invalid_body',
            message: parsed.error.issues.map((issue) => issue.message).join('; ')
          }
        },
        400
      )
    }
    try {
      let activity = create_outbound({
        actor: user.email,
        contexte: parsed.data.contexte,
        ref: parsed.data.ref,
        type,
        destinataire: parsed.data.destinataire,
        contenu: JSON.stringify({
          version: ACTIVITY_CONTENT_VERSION,
          ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
          ...(parsed.data.contenu.objet ? { objet: parsed.data.contenu.objet } : {}),
          corps: parsed.data.contenu.corps
        }),
        idempotency_key: idempotencyKey
      })
      if (activity.statut === 'queued') {
        const fails =
          Bun.env['NODE_ENV'] !== 'production' && /fail|invalide/i.test(parsed.data.destinataire)
        activity = update_status({
          activity_id: activity.id,
          type,
          statut: fails ? 'failed' : 'sent',
          occurred_at: next_status_timestamp(activity)
        })
      }
      return c.json({ data: activity }, 201)
    } catch (error) {
      if (error instanceof CommunicationsError) {
        return c.json({ error: { code: error.code, message: error.message } }, error_status(error))
      }
      throw error
    }
  }

const authorized = (c: Context, type: CommunicationType): boolean => {
  if (type === 'email') return cm_webhook_authorized(c.req.header('Webhook-Secret'))
  const expected = Bun.env['FAKE_WEBHOOK_KEY']?.trim()
  return Boolean(expected && c.req.header('Webhook-Secret') === expected)
}

export const fake_webhook_controller =
  (type: Exclude<CommunicationType, 'rcs'>, allowMessage = false) =>
  async (c: Context) => {
    if (!authorized(c, type)) {
      return c.json({ error: { code: 'unauthorized', message: 'Webhook key invalide' } }, 401)
    }
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
    }

    const status = StatusWebhook.safeParse(body)
    try {
      if (status.success) {
        if (!is_communication_status(type, status.data.status)) {
          return c.json(
            { error: { code: 'invalid_status', message: 'Statut invalide pour ce medium' } },
            400
          )
        }
        const activity = update_status({
          activity_id: status.data.activityId,
          type,
          statut: status.data.status,
          occurred_at: status.data.occurredAt
        })
        return c.json({ data: activity })
      }
      if (allowMessage && type === 'email') {
        const message = MessageWebhook.safeParse(body)
        if (message.success) {
          const sender = normalize_email(message.data.from)
          if (sender.status === 'invalid') {
            return c.json({ error: { code: 'invalid_body', message: 'Expéditeur invalide' } }, 400)
          }
          const recent = find_recent_thread(
            'email',
            sender.value,
            new Date(message.data.occurredAt)
          )
          const activity = recent
            ? create_inbound({
                contexte: recent.contexte,
                ref: recent.ref,
                type: 'email',
                auteur: recent.id_locataire
                  ? `tenant:${recent.id_locataire}`
                  : `external:${sender.value}`,
                contenu: JSON.stringify({
                  version: ACTIVITY_CONTENT_VERSION,
                  corps: message.data.content
                }),
                occurred_at: message.data.occurredAt,
                thread_id: recent.thread_id
              })
            : create_unmatched_inbound({
                type: 'email',
                auteur: `external:${sender.value}`,
                contenu: JSON.stringify({
                  version: ACTIVITY_CONTENT_VERSION,
                  corps: message.data.content
                }),
                occurred_at: message.data.occurredAt
              })
          return c.json({ data: activity }, 201)
        }
      }
      return c.json({ error: { code: 'invalid_body', message: 'Webhook invalide' } }, 400)
    } catch (error) {
      if (error instanceof CommunicationsError) {
        return c.json({ error: { code: error.code, message: error.message } }, error_status(error))
      }
      console.error(`[post.webhook.${type}]`, error)
      return c.json(
        { error: { code: 'processing_failed', message: 'Webhook processing failed' } },
        500
      )
    }
  }

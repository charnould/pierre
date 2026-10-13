import type { Context } from 'hono'
import { z } from 'zod'

import { businessModuleForActivityContext } from '../../../shared/modules'
import type { User } from '../../utils/_schema'
import { get_activity } from '../../utils/activities/rows'
import { userCanAccessModule } from '../../utils/authorize-role'
import { communication_reference, next_status_timestamp } from '../../utils/communications/parsing'
import {
  claim_outbound_dispatch,
  CommunicationsError,
  create_outbound
} from '../../utils/communications/storage'
import { normalize_email } from '../../utils/contacts'
import { settle_delivery } from '../../utils/delivery-status'
import { EmailSendError, send_transactional_email } from '../../utils/email/send'
import { moduleEmailFrom } from '../../utils/setup-store'

const Body = z
  .object({
    contexte: z.enum(['tickets', 'repayment']),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1),
    contenu: z
      .object({
        subject: z.string().trim().min(1),
        body: z.string().trim().min(1),
        action: z.string().trim().min(1).optional()
      })
      .strict()
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

export const controller = async (c: Context) => {
  const user = c.get('user') as User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
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
  if (!userCanAccessModule(user, businessModuleForActivityContext(parsed.data.contexte))) {
    return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
  }
  const destinataire = normalize_email(parsed.data.destinataire)
  if (destinataire.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Email invalide' } }, 400)
  }
  const from = moduleEmailFrom(parsed.data.contexte)
  if (!from) {
    return c.json(
      { error: { code: 'not_configured', message: 'email_from manquant pour ce module' } },
      503
    )
  }

  try {
    const activity = create_outbound({
      actor: user.email,
      contexte: parsed.data.contexte,
      ref: parsed.data.ref,
      type: 'email',
      destinataire: destinataire.value,
      contenu: JSON.stringify({
        version: 2,
        ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
        subject: parsed.data.contenu.subject,
        body: parsed.data.contenu.body
      }),
      idempotency_key: idempotencyKey
    })
    if (claim_outbound_dispatch(activity.id) !== 'claimed') {
      return c.json({ data: get_activity(activity.id) ?? activity }, 201)
    }
    try {
      await send_transactional_email({
        from,
        to: destinataire.value,
        subject: parsed.data.contenu.subject,
        text: parsed.data.contenu.body,
        reference: communication_reference(activity.id)
      })
    } catch (error) {
      const failed = settle_delivery({
        activity_id: activity.id,
        type: 'email',
        statut: 'failed',
        occurred_at: next_status_timestamp(activity)
      }).activity
      if (!(error instanceof EmailSendError)) console.error('[post.email]', error)
      const status = error instanceof EmailSendError && error.status === 503 ? 503 : 502
      return c.json(
        {
          error: {
            code: error instanceof EmailSendError ? error.code : 'provider_unavailable',
            message: error instanceof Error ? error.message : 'Échec de l’envoi email'
          },
          data: failed
        },
        status
      )
    }
    return c.json({ data: activity }, 201)
  } catch (error) {
    if (error instanceof CommunicationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, error_status(error))
    }
    throw error
  }
}

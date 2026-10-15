import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS } from '../../../shared/activites'
import { businessModuleForActivityContext } from '../../../shared/modules'
import { parse_rcs_contenu, with_sms_fallback } from '../../../shared/rcs-message'
import type { User } from '../../utils/_schema'
import { get_activity } from '../../utils/activities/rows'
import { userCanAccessModule } from '../../utils/authorize-role'
import { communication_reference, next_status_timestamp } from '../../utils/communications/parsing'
import {
  claim_outbound_dispatch,
  CommunicationsError,
  create_outbound,
  DISPATCH_RETRY_AFTER_SECONDS,
  release_outbound_dispatch
} from '../../utils/communications/storage'
import { mobile_channel, normalize_telephone } from '../../utils/contacts'
import { settle_delivery } from '../../utils/delivery-status'
import { RcsSendError, send_rcs_message, send_sms_message } from '../../utils/rcs/send'
import { to_cm_number, to_cm_suggestions } from '../../utils/rcs/wrap'

const Body = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1),
    contenu: z.unknown()
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
  const normalized = normalize_telephone(parsed.data.destinataire)
  if (normalized.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Numéro mobile invalide' } }, 400)
  }
  const contenu = parse_rcs_contenu(parsed.data.contenu)
  if (!contenu) {
    return c.json({ error: { code: 'invalid_body', message: 'Contenu RCS invalide' } }, 400)
  }

  const channel = mobile_channel(normalized.value)
  const smsBody = contenu.sms_fallback ?? contenu.body
  try {
    let activity = create_outbound({
      actor: user.email,
      contexte: parsed.data.contexte,
      ref: parsed.data.ref,
      type: channel,
      destinataire: normalized.value,
      contenu: JSON.stringify(channel === 'sms' ? { body: smsBody } : with_sms_fallback(contenu)),
      idempotency_key: idempotencyKey
    })
    const dispatch = claim_outbound_dispatch(activity.id)
    const current = get_activity(activity.id) ?? activity
    if (dispatch === 'pending') {
      c.header('Retry-After', String(DISPATCH_RETRY_AFTER_SECONDS))
      return c.json(
        {
          error: { code: 'dispatch_pending', message: 'Envoi déjà en cours, réessayez plus tard' },
          data: current
        },
        503
      )
    }
    if (dispatch === 'not_queued') return c.json({ data: current }, 201)

    try {
      if (channel === 'sms') {
        await send_sms_message({
          phone: to_cm_number(normalized.value),
          body: smsBody,
          reference: communication_reference(activity.id)
        })
      } else {
        const suggestions = to_cm_suggestions(contenu.choices)
        await send_rcs_message({
          phone: to_cm_number(normalized.value),
          richContent: {
            conversation: [{ text: contenu.body }],
            ...(suggestions.length ? { suggestions } : {})
          },
          body: { content: smsBody },
          reference: communication_reference(activity.id)
        })
      }
    } catch (error) {
      if (!(error instanceof RcsSendError) || error.retryable) {
        release_outbound_dispatch(activity.id)
        if (!(error instanceof RcsSendError)) console.error('[post.rcs]', error)
        c.header('Retry-After', String(DISPATCH_RETRY_AFTER_SECONDS))
        return c.json(
          {
            error: {
              code: error instanceof RcsSendError ? error.code : 'provider_unavailable',
              message: error instanceof Error ? error.message : 'Échec temporaire de l’envoi'
            },
            data: activity
          },
          503
        )
      }
      activity = settle_delivery({
        activity_id: activity.id,
        type: channel,
        statut: 'failed',
        occurred_at: next_status_timestamp(activity)
      }).activity
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message
          },
          data: activity
        },
        502
      )
    }
    settle_delivery({
      activity_id: activity.id,
      type: channel,
      statut: 'sent',
      occurred_at: next_status_timestamp(activity)
    })
    return c.json({ data: activity }, 201)
  } catch (error) {
    if (error instanceof CommunicationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, error_status(error))
    }
    throw error
  }
}

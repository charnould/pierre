import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS, ACTIVITY_CONTENT_VERSION } from '../../../shared/activites'
import type { Parsed_User } from '../../utils/_schema'
import { get_activity } from '../../utils/activities/rows'
import { communication_reference, next_status_timestamp } from '../../utils/communications/parsing'
import { update_status } from '../../utils/communications/status'
import {
  claim_outbound_dispatch,
  CommunicationsError,
  create_outbound
} from '../../utils/communications/storage'
import { normalize_telephone } from '../../utils/contacts'
import { RcsSendError, send_rcs_message } from '../../utils/rcs/send'
import { to_cm_number } from '../../utils/rcs/wrap'

const Body = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1),
    contenu: z
      .object({
        corps: z.string().trim().min(1),
        action: z.string().trim().min(1).optional(),
        choix: z
          .array(
            z
              .object({
                id: z.string().regex(/^[a-z][a-z0-9_]*$/),
                label: z.string().trim().min(1)
              })
              .strict()
          )
          .max(12)
          .optional()
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
  const user = c.get('user') as Parsed_User | null
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
  const normalized = normalize_telephone(parsed.data.destinataire)
  if (normalized.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Numéro mobile invalide' } }, 400)
  }

  try {
    let activity = create_outbound({
      actor: user.email,
      contexte: parsed.data.contexte,
      ref: parsed.data.ref,
      type: 'rcs',
      destinataire: normalized.value,
      contenu: JSON.stringify({
        version: ACTIVITY_CONTENT_VERSION,
        ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
        corps: parsed.data.contenu.corps,
        ...(parsed.data.contenu.choix?.length ? { choix: parsed.data.contenu.choix } : {})
      }),
      idempotency_key: idempotencyKey
    })
    if (activity.statut !== 'queued') {
      return c.json({ data: activity }, 201)
    }
    const dispatch = claim_outbound_dispatch(activity.id)
    if (dispatch === 'pending') return c.json({ data: activity }, 202)
    if (dispatch === 'abandoned') {
      return c.json(
        {
          error: {
            code: 'dispatch_state_unknown',
            message: "L'état d'un précédent envoi RCS est inconnu"
          },
          data: get_activity(activity.id)
        },
        502
      )
    }
    if (dispatch === 'not_queued') return c.json({ data: get_activity(activity.id) }, 201)

    const conversation: Record<string, unknown> = { text: parsed.data.contenu.corps }
    if (parsed.data.contenu.choix?.length) {
      conversation['suggestions'] = parsed.data.contenu.choix.map((choice) => ({
        action: 'Reply',
        label: choice.label,
        postbackdata: choice.id
      }))
    }
    try {
      await send_rcs_message({
        phone: to_cm_number(normalized.value),
        richContent: { conversation: [conversation] },
        body: { content: parsed.data.contenu.corps },
        reference: communication_reference(activity.id)
      })
    } catch (error) {
      activity = update_status({
        activity_id: activity.id,
        type: 'rcs',
        statut: 'failed',
        occurred_at: next_status_timestamp(activity)
      })
      if (!(error instanceof RcsSendError)) console.error('[post.rcs]', error)
      const status = error instanceof RcsSendError && error.status === 503 ? 503 : 502
      return c.json(
        {
          error: {
            code: error instanceof RcsSendError ? error.code : 'provider_unavailable',
            message: error instanceof Error ? error.message : 'Échec de l’envoi RCS'
          },
          data: activity
        },
        status
      )
    }
    activity = update_status({
      activity_id: activity.id,
      type: 'rcs',
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

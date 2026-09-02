import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS, ACTIVITY_CONTENT_VERSION } from '../../../shared/activites'
import type { Parsed_User } from '../../utils/_schema'
import { next_status_timestamp } from '../../utils/communications/parsing'
import { update_status } from '../../utils/communications/status'
import { CommunicationsError, create_outbound } from '../../utils/communications/storage'

const Body = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1),
    contenu: z
      .object({
        objet: z.string().trim().min(1).optional(),
        corps: z.string(),
        action: z.string().trim().min(1).optional()
      })
      .strict()
      .refine((value) => Boolean(value.objet?.trim() || value.corps.trim()), {
        message: 'objet ou corps requis'
      })
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

/** Journalise un courriel déjà envoyé hors Pierre (client mail). Type d’activité : `email`. */
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
  try {
    let activity = create_outbound({
      actor: user.email,
      contexte: parsed.data.contexte,
      ref: parsed.data.ref,
      type: 'email',
      destinataire: parsed.data.destinataire,
      contenu: JSON.stringify({
        version: ACTIVITY_CONTENT_VERSION,
        ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
        ...(parsed.data.contenu.objet ? { objet: parsed.data.contenu.objet } : {}),
        corps: parsed.data.contenu.corps.trim()
      }),
      idempotency_key: idempotencyKey
    })
    if (activity.statut === 'queued') {
      activity = update_status({
        activity_id: activity.id,
        type: 'email',
        statut: 'sent',
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

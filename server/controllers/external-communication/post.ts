import type { Context } from 'hono'
import { z } from 'zod'

import {
  ACTIVITY_CONTENT_VERSION,
  ACTIVITY_CONTEXTS,
  COMMUNICATION_TYPES
} from '../../../shared/activites'
import type { Parsed_User } from '../../utils/_schema'
import { update_status } from '../../utils/bulk/status'
import { next_status_timestamp } from '../../utils/communications/parsing'
import { CommunicationsError, create_outbound } from '../../utils/communications/storage'

const Body = z
  .object({
    canal: z.enum(COMMUNICATION_TYPES),
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    destinataire: z.string().trim().min(1).optional(),
    contenu: z
      .object({
        objet: z.string().trim().min(1).optional(),
        corps: z.string(),
        action: z.string().trim().min(1).optional(),
        choix: z
          .array(z.object({ id: z.string().trim().min(1), label: z.string().trim().min(1) }))
          .optional(),
        tenant_reply: z.literal(true).optional(),
        external_application: z
          .object({ name: z.string().trim().min(1) })
          .strict()
          .optional()
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

/** Journalise une communication déjà envoyée hors Pierre, sans appeler de fournisseur. */
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
      type: parsed.data.canal,
      destinataire: parsed.data.destinataire,
      allow_missing_destination: true,
      contenu: JSON.stringify({
        version: ACTIVITY_CONTENT_VERSION,
        ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
        ...(parsed.data.contenu.objet ? { objet: parsed.data.contenu.objet } : {}),
        corps: parsed.data.contenu.corps.trim(),
        ...(parsed.data.contenu.choix ? { choix: parsed.data.contenu.choix } : {}),
        ...(parsed.data.contenu.tenant_reply ? { tenant_reply: true } : {}),
        ...(parsed.data.contenu.external_application
          ? { external_application: parsed.data.contenu.external_application }
          : {})
      }),
      idempotency_key: idempotencyKey
    })
    if (activity.statut === 'queued') {
      activity = update_status({
        activity_id: activity.id,
        type: parsed.data.canal,
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

import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { ReclamationsUpsertError, upsert_reclamation } from '../../../utils/reclamations-upsert'

const PutTicketBody = z.object({
  id_reclamation: z.string().trim().min(1),
  id_locataire: z.string().trim().min(1),
  message: z.string().optional()
})

/**
 * PUT /desktop/tickets
 */
export const controller = async (c: Context) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }

  const parsed = PutTicketBody.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ') || 'invalid body'
    return c.json({ error: { code: 'invalid_body', message } }, 400)
  }

  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

  try {
    const result = upsert_reclamation(parsed.data)
    return c.json({ ok: true, ...result })
  } catch (e) {
    if (e instanceof ReclamationsUpsertError) {
      return c.json({ error: { code: 'invalid_body', message: e.message } }, 400)
    }
    console.error('[put.desktop.tickets] Error:', e)
    return c.json(
      {
        error: {
          code: 'internal_error',
          message: 'Erreur lors de la sauvegarde de la réclamation.'
        }
      },
      500
    )
  }
}

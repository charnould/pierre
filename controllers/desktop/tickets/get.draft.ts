import type { Context } from 'hono'
import { z } from 'zod'

import {
  get_ticket_draft,
  list_ticket_drafts,
  TICKET_ID_SKILLS
} from '../../../utils/ticket-drafts'

const GetDraftQuery = z.object({
  id_reclamation: z.string().trim().min(1),
  id_skill: z.enum(TICKET_ID_SKILLS).optional()
})

/**
 * GET /desktop/tickets/drafts
 */
export const controller = async (c: Context) => {
  const parsed = GetDraftQuery.safeParse({
    id_reclamation: c.req.query('id_reclamation'),
    id_skill: c.req.query('id_skill') || undefined
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ') || 'invalid query'
    return c.json({ error: { code: 'invalid_query', message } }, 400)
  }

  const { id_reclamation, id_skill } = parsed.data

  if (id_skill) {
    const draft = get_ticket_draft(id_reclamation, id_skill)
    return c.json({ data: draft })
  }

  const drafts = list_ticket_drafts(id_reclamation)
  return c.json({ data: drafts })
}

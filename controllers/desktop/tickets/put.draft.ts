import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import {
  ANSWER_CHANNELS,
  TicketDraftsError,
  TICKET_ID_SKILLS,
  upsert_ticket_draft
} from '../../../utils/ticket-drafts'

const PutDraftBody = z.discriminatedUnion('save_kind', [
  z.object({
    save_kind: z.literal('generation'),
    id_reclamation: z.string().trim().min(1),
    id_skill: z.enum(TICKET_ID_SKILLS),
    channel: z.enum(ANSWER_CHANNELS).optional(),
    generated_output: z.string().optional(),
    generated_reasoning: z.string().optional(),
    generated_duration_ms: z.number().int().nonnegative().optional()
  }),
  z.object({
    save_kind: z.literal('edit'),
    id_reclamation: z.string().trim().min(1),
    id_skill: z.enum(TICKET_ID_SKILLS),
    edited_output: z.string().optional()
  })
])

/**
 * PUT /desktop/tickets/drafts
 */
export const controller = async (c: Context) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }

  const parsed = PutDraftBody.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ') || 'invalid body'
    return c.json({ error: { code: 'invalid_body', message } }, 400)
  }

  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

  try {
    const draft =
      parsed.data.save_kind === 'generation'
        ? upsert_ticket_draft({
            ...parsed.data,
            generated_by: user.email
          })
        : upsert_ticket_draft({
            ...parsed.data,
            edited_by: user.email
          })

    return c.json({
      ok: true,
      generated_at: draft.generated_at,
      generated_by: draft.generated_by,
      edited_at: draft.edited_at,
      edited_by: draft.edited_by
    })
  } catch (e) {
    if (e instanceof TicketDraftsError) {
      const status = e.message === 'Draft not found' ? 404 : 400
      return c.json(
        { error: { code: status === 404 ? 'not_found' : 'invalid_body', message: e.message } },
        status
      )
    }
    console.error('[put.desktop.tickets.drafts] Error:', e)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la sauvegarde du brouillon.' } },
      500
    )
  }
}

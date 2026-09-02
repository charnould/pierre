import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS } from '../../../../shared/activites'
import type { Parsed_User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import { build_rattachement } from '../../../utils/activities/rows'

export const Query = z
  .object({
    rattachement: z.string().trim().min(1).optional(),
    contexte: z.enum(ACTIVITY_CONTEXTS).optional(),
    ref: z.string().trim().min(1).optional(),
    inbox: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    unread_only: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    auteurs: z
      .string()
      .trim()
      .min(1)
      .transform((value) => [...new Set(value.split(',').map((entry) => entry.trim()))])
      .pipe(z.array(z.string().regex(/^user:[^,\s]+$/)).min(1))
      .optional(),
    id_client: z.string().trim().min(1).optional(),
    id_locataire: z.string().trim().min(1).optional(),
    id_lot: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    statut: z.string().trim().min(1).optional(),
    current_threads: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    state: z.enum(['a_faire', 'fait', 'ignore']).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
    offset: z.coerce.number().int().nonnegative().optional()
  })
  .refine((value) => Boolean(value.contexte) === Boolean(value.ref), {
    message: 'contexte and ref must be provided together'
  })
  .refine((value) => !(value.rattachement && value.contexte), {
    message: 'use rattachement or contexte/ref, not both'
  })
  .refine((value) => !value.current_threads || value.type === 'action', {
    message: 'current_threads requires type=action'
  })

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const parsed = Query.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_query',
          message: parsed.error.issues.map((issue) => issue.message).join('; ')
        }
      },
      400
    )
  }
  const { contexte, ref, ...options } = parsed.data
  const rattachement = contexte && ref ? build_rattachement(contexte, ref) : options.rattachement
  const data = list_activities(user.email, { ...options, rattachement })
  return c.json({ data })
}

import type { Context } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS } from '../../../../shared/activites'
import { businessModuleForActivityContext } from '../../../../shared/modules'
import type { User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import { build_rattachement, parse_rattachement } from '../../../utils/activities/rows'
import { activityContextsForUser, userCanAccessModule } from '../../../utils/authorize-role'

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
    current_threads: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    state: z.enum(['open', 'completed', 'ignored', 'deleted']).optional(),
    assignee: z.enum(['me', 'other']).optional(),
    created_by: z.enum(['me']).optional(),
    order: z.enum(['due_asc']).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
    offset: z.coerce.number().int().nonnegative().optional()
  })
  .refine((value) => Boolean(value.contexte) === Boolean(value.ref), {
    message: 'contexte and ref must be provided together'
  })
  .refine((value) => !(value.rattachement && value.contexte), {
    message: 'use rattachement or contexte/ref, not both'
  })
  .refine((value) => !value.current_threads || !value.type || value.type.startsWith('task.'), {
    message: 'current_threads filters task threads'
  })

export const controller = async (c: Context) => {
  const user = c.get('user') as User | null
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
  const targetContext =
    contexte ?? (rattachement ? parse_rattachement(rattachement)?.contexte : null)
  if (
    targetContext &&
    !userCanAccessModule(user, businessModuleForActivityContext(targetContext))
  ) {
    return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
  }
  const data = list_activities(user.email, {
    ...options,
    rattachement,
    contexts: activityContextsForUser(user)
  })
  return c.json({ data })
}

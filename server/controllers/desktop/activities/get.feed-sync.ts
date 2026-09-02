import type { Context } from 'hono'
import { z } from 'zod'

import type { ActivityFeedSyncData } from '../../../../shared/activites'
import type { Parsed_User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'

export const Query = z.object({
  auteurs: z
    .string()
    .default('')
    .transform((value) => [
      ...new Set(
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    ])
    .pipe(z.array(z.string().regex(/^user:[^,\s]+$/))),
  unread_only: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  inbox_limit: z.coerce.number().int().positive().max(500).default(50),
  authored_limit: z.coerce.number().int().positive().max(500).default(50)
})

export const etagFor = (data: ActivityFeedSyncData): string =>
  `"activity-feed-${Bun.hash(JSON.stringify(data)).toString(36)}"`

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

  const data: ActivityFeedSyncData = {
    notifications: list_activities(user.email, {
      inbox: true,
      unread_only: parsed.data.unread_only,
      limit: parsed.data.inbox_limit,
      offset: 0
    }),
    authored:
      parsed.data.auteurs.length === 0
        ? []
        : list_activities(user.email, {
            auteurs: parsed.data.auteurs,
            limit: parsed.data.authored_limit,
            offset: 0
          })
  }
  const etag = etagFor(data)
  c.header('ETag', etag)
  c.header('Cache-Control', 'private, no-cache')
  if (c.req.header('If-None-Match') === etag) return c.body(null, 304)
  return c.json({ data })
}

import { Hono } from 'hono'
import { z } from 'zod'

import { ACTIVITY_CONTEXTS, type ActivityFeedSyncData } from '../../shared/activities'
import { businessModuleForActivityContext } from '../../shared/modules'
import { list_activities } from '../utils/activities/query'
import { build_rattachement, get_activity, parse_rattachement } from '../utils/activities/rows'
import {
  ActivitiesError,
  ActivityPatchInput,
  CreateActivityInput
} from '../utils/activities/schema'
import { create_activity, delete_activity, patch_activity } from '../utils/activities/write'
import { type AuthContext, authenticate, type AuthEnv } from '../utils/authenticate-user'
import { activityContextsForUser, userCanAccessModule } from '../utils/authorize-role'

export const ActivityFeedQuery = z.object({
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
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  inboxLimit: z.coerce.number().int().positive().max(500).default(50),
  authoredLimit: z.coerce.number().int().positive().max(500).default(50)
})

export const ListActivitiesQuery = z
  .object({
    rattachement: z.string().trim().min(1).optional(),
    contexte: z.enum(ACTIVITY_CONTEXTS).optional(),
    ref: z.string().trim().min(1).optional(),
    inbox: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    unreadOnly: z
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
    currentThreads: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    state: z.enum(['open', 'completed', 'ignored', 'deleted']).optional(),
    assignee: z.enum(['me', 'other']).optional(),
    createdBy: z.enum(['me']).optional(),
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
  .refine((value) => !value.currentThreads || !value.type || value.type.startsWith('task.'), {
    message: 'currentThreads filters task threads'
  })

export const etagForActivityFeed = (data: ActivityFeedSyncData): string =>
  `"activity-feed-${Bun.hash(JSON.stringify(data)).toString(36)}"`

const activityErrorResponse = (c: AuthContext, error: ActivitiesError) => {
  const status =
    error.code === 'not_found'
      ? 404
      : error.code === 'forbidden'
        ? 403
        : error.code === 'conflict'
          ? 409
          : 400
  return c.json({ error: { code: error.code, message: error.message } }, status)
}

const syncActivityFeed = async (c: AuthContext) => {
  const user = c.get('user')

  const searchParams = new URL(c.req.url).searchParams
  if (['unread_only', 'inbox_limit', 'authored_limit'].some((key) => searchParams.has(key))) {
    return c.json({ error: { code: 'invalid_query', message: 'Unknown query field' } }, 400)
  }
  const parsed = ActivityFeedQuery.safeParse(Object.fromEntries(searchParams))
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
      contexts: activityContextsForUser(user),
      inbox: true,
      unreadOnly: parsed.data.unreadOnly,
      limit: parsed.data.inboxLimit,
      offset: 0
    }),
    authored:
      parsed.data.auteurs.length === 0
        ? []
        : list_activities(user.email, {
            contexts: activityContextsForUser(user),
            auteurs: parsed.data.auteurs,
            limit: parsed.data.authoredLimit,
            offset: 0
          })
  }
  const etag = etagForActivityFeed(data)
  c.header('ETag', etag)
  c.header('Cache-Control', 'private, no-cache')
  if (c.req.header('If-None-Match') === etag) return c.body(null, 304)
  return c.json({ data })
}

const listActivities = async (c: AuthContext) => {
  const user = c.get('user')
  const searchParams = new URL(c.req.url).searchParams
  if (['unread_only', 'current_threads', 'created_by'].some((key) => searchParams.has(key))) {
    return c.json({ error: { code: 'invalid_query', message: 'Unknown query field' } }, 400)
  }
  const parsed = ListActivitiesQuery.safeParse(Object.fromEntries(searchParams))
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
  const { contexte, ref, unreadOnly, currentThreads, createdBy, ...options } = parsed.data
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
    unreadOnly,
    currentThreads,
    createdBy,
    rattachement,
    contexts: activityContextsForUser(user)
  })
  return c.json({ data })
}

export const createActivity = async (c: AuthContext) => {
  const user = c.get('user')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = CreateActivityInput.safeParse(body)
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
  try {
    return c.json({
      data: create_activity(user.email, parsed.data)
    })
  } catch (error) {
    if (error instanceof ActivitiesError || error instanceof z.ZodError) {
      const forbidden = error instanceof ActivitiesError && error.code === 'forbidden'
      const conflict = error instanceof ActivitiesError && error.code === 'conflict'
      const status = forbidden ? 403 : conflict ? 409 : 400
      return c.json(
        {
          error: {
            code: forbidden ? 'forbidden' : conflict ? 'conflict' : 'invalid_body',
            message: error.message
          }
        },
        status
      )
    }
    throw error
  }
}

export const patchActivity = async (c: AuthContext) => {
  const user = c.get('user')
  const id = z.coerce.number().int().positive().safeParse(c.req.param('id'))
  if (!id.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Activity id required' } }, 400)
  }
  const activity = get_activity(id.data)
  const context = activity ? parse_rattachement(activity.rattachement)?.contexte : null
  if (
    activity &&
    (!context || !userCanAccessModule(user, businessModuleForActivityContext(context)))
  ) {
    return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = ActivityPatchInput.safeParse(body)
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
    const data = patch_activity(user.email, id.data, parsed.data)
    return c.json({ data })
  } catch (error) {
    if (error instanceof ActivitiesError) return activityErrorResponse(c, error)
    throw error
  }
}

export const deleteActivity = async (c: AuthContext) => {
  const user = c.get('user')
  const id = z.coerce.number().int().positive().safeParse(c.req.param('id'))
  if (!id.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Activity id required' } }, 400)
  }
  const activity = get_activity(id.data)
  const context = activity ? parse_rattachement(activity.rattachement)?.contexte : null
  if (
    activity &&
    (!context || !userCanAccessModule(user, businessModuleForActivityContext(context)))
  ) {
    return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
  }
  try {
    delete_activity(user.email, id.data)
    return c.json({ data: { deleted: true } })
  } catch (error) {
    if (error instanceof ActivitiesError) return activityErrorResponse(c, error)
    throw error
  }
}

export const activities = new Hono<AuthEnv>()

activities.use('*', authenticate)
activities.get('/feed', syncActivityFeed)
activities.get('/', listActivities)
activities.post('/', createActivity)
activities.patch('/:id', patchActivity)
activities.delete('/:id', deleteActivity)

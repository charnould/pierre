import type { Context, Next } from 'hono'

import { ACTIVITY_CONTEXTS, type ActivityContext } from '../../shared/activites'
import { businessModuleForActivityContext, type BusinessModuleId } from '../../shared/modules'
import type { User } from './_schema'

const unauthorized = (c: Context) =>
  c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)

const forbidden = (c: Context) =>
  c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)

export const userCanAccessModule = (
  user: User | null | undefined,
  moduleId: BusinessModuleId | null
): boolean => moduleId !== null && Boolean(user?.moduleIds?.includes(moduleId))

export const activityContextsForUser = (user: User): ActivityContext[] =>
  ACTIVITY_CONTEXTS.filter((context) =>
    userCanAccessModule(user, businessModuleForActivityContext(context))
  )

export const authorizeAdministrator = async (c: Context, next: Next) => {
  const user = c.get('user') as User | null | undefined
  if (!user?.email) return unauthorized(c)
  if (!user.isAdministrator) return forbidden(c)
  return await next()
}

export const authorizeModule = (moduleId: BusinessModuleId) => async (c: Context, next: Next) => {
  const user = c.get('user') as User | null | undefined
  if (!user?.email) return unauthorized(c)
  if (!userCanAccessModule(user, moduleId)) return forbidden(c)
  return await next()
}

export const authorizeAnyModule =
  (...moduleIds: BusinessModuleId[]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user') as User | null | undefined
    if (!user?.email) return unauthorized(c)
    if (!moduleIds.some((moduleId) => user.moduleIds.includes(moduleId))) return forbidden(c)
    return await next()
  }

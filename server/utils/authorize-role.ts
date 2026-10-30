import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import { ACTIVITY_CONTEXTS, type ActivityContext } from '../../shared/activities'
import { businessModuleForActivityContext, type BusinessModuleId } from '../../shared/modules'
import type { User } from './_schema'
import type { AuthEnv } from './authenticate-user'

const forbidden = (c: Context) =>
  c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)

export const userCanAccessModule = (user: User, moduleId: BusinessModuleId | null): boolean =>
  moduleId !== null && user.moduleIds.includes(moduleId)

export const activityContextsForUser = (user: User): ActivityContext[] =>
  ACTIVITY_CONTEXTS.filter((context) =>
    userCanAccessModule(user, businessModuleForActivityContext(context))
  )

export const authorizeAdministrator = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get('user')
  if (!user.isAdministrator) return forbidden(c)
  return next()
})

export const authorizeModule = (moduleId: BusinessModuleId) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get('user')
    if (!userCanAccessModule(user, moduleId)) return forbidden(c)
    return next()
  })

export const authorizeAnyModule = (...moduleIds: BusinessModuleId[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get('user')
    if (!moduleIds.some((moduleId) => user.moduleIds.includes(moduleId))) return forbidden(c)
    return next()
  })

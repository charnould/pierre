import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import type { User } from '../../../utils/_schema'
import {
  activityContextsForUser,
  authorizeAdministrator,
  authorizeAnyModule,
  authorizeModule
} from '../../../utils/authorize-role'

const user = (isAdministrator: boolean): User => ({
  email: `${isAdministrator ? 'admin' : 'user'}@example.org`,
  isAdministrator,
  moduleIds: [],
  chatbotIds: ['default']
})

const app_for = (isAdministrator?: boolean) => {
  const app = new Hono<{ Variables: { user: User } }>()
  app.use('*', async (c, next) => {
    if (isAdministrator !== undefined) c.set('user', user(isAdministrator))
    await next()
  })
  app.get('/read', (c) => c.json({ data: true }))
  app.post('/write', (c) => c.json({ data: true }))
  app.post('/bulk/execute', authorizeAdministrator, (c) => c.json({ data: true }))
  app.get('/tickets', authorizeModule('tickets'), (c) => c.json({ data: true }))
  app.patch('/me/preferences', (c) => c.json({ data: true }))
  return app
}

describe('administrator authorization policy', () => {
  it('allows standard authenticated users to use ordinary desktop routes', async () => {
    expect((await app_for(false).request('/read')).status).toBe(200)
    expect((await app_for(false).request('/me/preferences', { method: 'PATCH' })).status).toBe(200)
    expect((await app_for(false).request('/write', { method: 'POST' })).status).toBe(200)
  })

  it('reserves bulk execution for administrators and normalizes denials', async () => {
    const forbidden = await app_for(false).request('/bulk/execute', {
      method: 'POST'
    })
    expect(forbidden.status).toBe(403)
    expect(await forbidden.json()).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' }
    })
    expect(
      (
        await app_for(true).request('/bulk/execute', {
          method: 'POST'
        })
      ).status
    ).toBe(200)
  })

  it('allows only users explicitly assigned to a business module', async () => {
    expect((await app_for(true).request('/tickets')).status).toBe(403)

    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', async (c, next) => {
      c.set('user', { ...user(false), moduleIds: ['tickets'] })
      await next()
    })
    app.get('/tickets', authorizeModule('tickets'), (c) => c.json({ data: true }))
    expect((await app.request('/tickets')).status).toBe(200)
  })

  it('supports data endpoints shared by explicit consumer modules', async () => {
    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', async (c, next) => {
      c.set('user', { ...user(false), moduleIds: ['automations'] })
      await next()
    })
    app.get('/tickets', authorizeAnyModule('tickets', 'automations'), (c) => c.json({ data: true }))
    expect((await app.request('/tickets')).status).toBe(200)
  })

  it('filters transversal activity contexts from module access', () => {
    expect(activityContextsForUser({ ...user(false), moduleIds: ['tickets'] })).toEqual([
      'tickets',
      'a_qualifier'
    ])
  })
})

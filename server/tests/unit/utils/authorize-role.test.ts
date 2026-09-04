import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import type { Parsed_User, User } from '../../../utils/_schema'
import { authorize_administrator, authorize_mutation } from '../../../utils/authorize-role'

const user = (role: User['role']): Parsed_User => ({
  email: `${role}@example.org`,
  role,
  config: ['default'],
  password_hash: 'unused'
})

const app_for = (role?: User['role']) => {
  const app = new Hono<{ Variables: { user: Parsed_User } }>()
  app.use('*', async (c, next) => {
    if (role) c.set('user', user(role))
    await next()
  })
  app.get('/desktop/read', (c) => c.json({ data: true }))
  app.post('/desktop/write', authorize_mutation, (c) => c.json({ data: true }))
  app.post('/desktop/bulk/execute', authorize_administrator, (c) => c.json({ data: true }))
  app.patch('/desktop/me/preferences', (c) => c.json({ data: true }))
  return app
}

describe('role authorization policy', () => {
  it('allows every authenticated role to read and update its own preferences', async () => {
    for (const role of ['collaborator', 'contributor', 'administrator'] as const) {
      expect((await app_for(role).request('/desktop/read')).status).toBe(200)
      expect(
        (await app_for(role).request('/desktop/me/preferences', { method: 'PATCH' })).status
      ).toBe(200)
    }
  })

  it('allows every authenticated role to mutate desktop resources', async () => {
    for (const role of ['collaborator', 'contributor', 'administrator'] as const) {
      expect((await app_for(role).request('/desktop/write', { method: 'POST' })).status).toBe(200)
    }
  })

  it('reserves bulk execution for administrators and normalizes denials', async () => {
    const forbidden = await app_for('contributor').request('/desktop/bulk/execute', {
      method: 'POST'
    })
    expect(forbidden.status).toBe(403)
    expect(await forbidden.json()).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' }
    })
    expect(
      (
        await app_for('administrator').request('/desktop/bulk/execute', {
          method: 'POST'
        })
      ).status
    ).toBe(200)
  })

  it('returns a JSON 401 when authentication context is absent', async () => {
    const response = await app_for().request('/desktop/write', { method: 'POST' })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })
})

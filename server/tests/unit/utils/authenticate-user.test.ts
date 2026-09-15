import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { Hono } from 'hono'

import type { User } from '../../../utils/_schema'
import { getAuth } from '../../../utils/auth'
import {
  authenticate,
  authenticateAdministratorApi,
  authenticateChat
} from '../../../utils/authenticate-user'
import { datastorePaths } from '../../../utils/paths'
import { createTestUser } from '../../test-user'
import { use_identity_test_env } from './identity-test-env'

const SECRET = '0123456789abcdef0123456789abcdef'
const ORIGINAL_AUTH_SECRET = Bun.env['AUTH_SECRET']
const ORIGINAL_AUTH_BEARER = Bun.env['AUTH_BEARER']

use_identity_test_env('_test_authenticate_user')

beforeAll(() => {
  Bun.env['AUTH_SECRET'] = SECRET
  Bun.env['AUTH_BEARER'] = 'knowledge-test-token'
})

afterAll(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) delete Bun.env['AUTH_SECRET']
  else Bun.env['AUTH_SECRET'] = ORIGINAL_AUTH_SECRET
  if (ORIGINAL_AUTH_BEARER === undefined) delete Bun.env['AUTH_BEARER']
  else Bun.env['AUTH_BEARER'] = ORIGINAL_AUTH_BEARER
})

describe('authenticate', () => {
  test('accepts standard Bearer authentication for the knowledge API', async () => {
    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', authenticateAdministratorApi)
    app.get('/api/admin/knowledge', (c) => c.json({ email: c.get('user').email }))

    const unauthorized = await app.request('/api/admin/knowledge')
    expect(unauthorized.status).toBe(401)

    const authorized = await app.request('/api/admin/knowledge', {
      headers: { Authorization: 'Bearer knowledge-test-token' }
    })
    expect(authorized.status).toBe(200)
    expect(await authorized.json()).toEqual({ email: 'cli@pierre.local' })
  })

  test('returns JSON 401 for anonymous desktop and communication requests', async () => {
    const app = new Hono()
    app.use('*', authenticate)
    app.get('/desktop/test', (c) => c.json({ ok: true }))
    app.post('/communications/external', (c) => c.json({ ok: true }))

    for (const [path, method] of [
      ['/desktop/test', 'GET'],
      ['/communications/external', 'POST']
    ] as const) {
      const response = await app.request(path, { method, redirect: 'manual' })
      expect(response.status).toBe(401)
      expect(response.headers.get('location')).toBeNull()
      expect(await response.json()).toEqual({
        error: { code: 'unauthorized', message: 'Authentication required' }
      })
    }
  })

  test('redirects an anonymous protected chatbot to /login', async () => {
    const app = new Hono()
    app.use('*', authenticateChat)
    app.get('/c', (c) => c.text('ok'))

    const response = await app.request('/c?config=testing_purpose_1&data=', {
      redirect: 'manual'
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      '/login?redirect=%2Fc%3Fconfig%3Dtesting_purpose_1%26data%3D'
    )
  })

  test('resolves a Better Auth session for protected routes', async () => {
    await createTestUser(
      {
        email: 'session-test@example.org',
        isAdministrator: false,
        moduleIds: [],
        chatbotIds: ['default']
      },
      'session-password'
    )

    const app = new Hono<{ Variables: { user: User } }>()
    app.all('/auth/*', (c) => getAuth().handler(c.req.raw))
    app.use('/desktop/*', authenticate)
    app.get('/desktop/test', (c) => c.json({ email: c.get('user').email }))

    const login = await app.request('/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.202'
      },
      body: JSON.stringify({
        email: 'session-test@example.org',
        password: 'session-password'
      })
    })
    expect(login.status).toBe(200)

    const setCookie = login.headers
      .getSetCookie()
      .find((cookie) => cookie.includes('pierre.session_token='))
    expect(setCookie).toBeDefined()

    using db = new Database(datastorePaths().database)
    db.run('UPDATE session SET expiresAt = ?', [new Date(Date.now() + 86_400_000).toISOString()])

    const response = await app.request('/desktop/test', {
      headers: { cookie: setCookie!.split(';', 1)[0]! }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: 'session-test@example.org' })
    expect(
      response.headers.getSetCookie().some((cookie) => cookie.includes('pierre.session_token='))
    ).toBe(true)
  })
})

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { Hono } from 'hono'
import { setSignedCookie } from 'hono/cookie'

import { authenticate } from '../../../utils/authenticate-user'

const SECRET = '0123456789abcdef0123456789abcdef'
const ORIGINAL_AUTH_SECRET = Bun.env['AUTH_SECRET']

beforeAll(() => {
  Bun.env['AUTH_SECRET'] = SECRET
})

afterAll(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) delete Bun.env['AUTH_SECRET']
  else Bun.env['AUTH_SECRET'] = ORIGINAL_AUTH_SECRET
})

describe('authenticate', () => {
  test('treats a signed but malformed encrypted cookie as unauthenticated', async () => {
    const issuer = new Hono()
    issuer.get('/', async (c) => {
      await setSignedCookie(c, 'pierre-ia', 'not-an-encrypted-session', SECRET)
      return c.text('ok')
    })
    const issued = await issuer.request('/')
    const cookie = issued.headers.get('set-cookie')?.split(';', 1)[0]
    expect(cookie).toBeTruthy()

    const app = new Hono()
    app.use('*', authenticate)
    app.get('/desktop/test', (c) => c.json({ ok: true }))
    const response = await app.request('/desktop/test', { headers: { cookie: cookie! } })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })
})

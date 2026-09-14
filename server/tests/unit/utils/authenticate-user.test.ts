import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { Hono } from 'hono'
import { setSignedCookie } from 'hono/cookie'

import {
  authenticate,
  authenticateAdministratorApi,
  encrypt
} from '../../../utils/authenticate-user'
import { saveUser } from '../../../utils/handle-user'

const SECRET = '0123456789abcdef0123456789abcdef'
const ORIGINAL_AUTH_SECRET = Bun.env['AUTH_SECRET']
const ORIGINAL_AUTH_BEARER = Bun.env['AUTH_BEARER']

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
    const app = new Hono()
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

  test('does not classify the external communication endpoint as a chatbot route', async () => {
    const app = new Hono()
    app.use('*', authenticate)
    app.post('/communications/external', (c) => c.json({ ok: true }))

    const response = await app.request('/communications/external', {
      method: 'POST',
      redirect: 'manual'
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

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

  test('reserves every /a page for administrators', async () => {
    const issueCookie = async (email: string) => {
      const issuer = new Hono()
      issuer.get('/', async (c) => {
        await setSignedCookie(
          c,
          'pierre-ia',
          await encrypt(JSON.stringify({ email }), SECRET),
          SECRET
        )
        return c.text('ok')
      })
      return (await issuer.request('/')).headers.get('set-cookie')!.split(';', 1)[0]!
    }

    await saveUser({
      email: 'standard-auth-test@example.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['default'],
      passwordHash: 'unused'
    })
    await saveUser({
      email: 'admin-auth-test@example.org',
      isAdministrator: true,
      moduleIds: [],
      chatbotIds: ['default'],
      passwordHash: 'unused'
    })

    const app = new Hono()
    app.use('*', authenticate)
    app.get('/a', (c) => c.text('ok'))

    const standard = await app.request('/a', {
      headers: { cookie: await issueCookie('standard-auth-test@example.org') }
    })
    expect(standard.status).toBe(302)
    expect(standard.headers.get('location')).toBe('/a/login')

    const administrator = await app.request('/a', {
      headers: { cookie: await issueCookie('admin-auth-test@example.org') }
    })
    expect(administrator.status).toBe(200)
  })
})

import { beforeEach, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { getAuth } from '../../../../utils/auth'
import { use_identity_test_env } from '../../utils/identity-test-env'

use_identity_test_env('_test_auth_routes')

let requestIp = 0
const jsonRequest = (path: string, body: object) => {
  requestIp += 1
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `203.0.113.${requestIp}`
    },
    body: JSON.stringify(body)
  })
}

let app: Hono
beforeEach(() => {
  app = new Hono()
  app.all('/auth/admin/*', (c) => c.notFound())
  app.all('/auth/*', (c) => getAuth().handler(c.req.raw))
})

it('keeps sign-up and the Better Auth admin API private', async () => {
  const signUp = await app.request(
    jsonRequest('/auth/sign-up/email', {
      email: 'public@example.org',
      name: 'Public',
      password: 'public-password'
    })
  )
  expect(signUp.ok).toBe(false)
  expect((await app.request('/auth/admin/list-users')).status).toBe(404)
})

it('returns the same error for unknown emails and incorrect passwords', async () => {
  const responses = await Promise.all([
    app.request(
      jsonRequest('/auth/sign-in/email', {
        email: 'unknown@example.org',
        password: 'wrong-password'
      })
    ),
    app.request(
      jsonRequest('/auth/sign-in/email', {
        email: 'another-unknown@example.org',
        password: 'wrong-password'
      })
    )
  ])
  const bodies = await Promise.all(responses.map((response) => response.json()))
  expect(responses.map(({ status }) => status)).toEqual([401, 401])
  expect(bodies).toEqual([
    { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
    { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }
  ])
})

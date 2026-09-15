import { afterAll, beforeAll, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_ai_boot } from '../../../../controllers/ai/get.boot'
import type { User } from '../../../../utils/_schema'
import { getAuth } from '../../../../utils/auth'
import { authenticateOptional } from '../../../../utils/authenticate-user'
import { deleteAllUsers } from '../../../../utils/handle-user'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'
import { createTestUser } from '../../../test-user'

const app = new Hono<{ Variables: { user: User | null } }>()
app.all('/auth/*', (c) => getAuth().handler(c.req.raw))
app.get('/ai/boot', authenticateOptional, get_ai_boot)

const paths = testDatastorePaths('ai_boot')

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  Bun.env['AUTH_SECRET'] ??= '0123456789abcdef0123456789abcdef'
  await setup()
  await deleteAllUsers()
  await createTestUser(
    {
      email: 'boot-test@pierre-ia.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['demo', 'testing_purpose_1', 'testing_purpose_2']
    },
    'boot-test-pw'
  )
})

afterAll(async () => {
  await deleteAllUsers()
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

function sessionCookie(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? []
  const fallback = response.headers.get('set-cookie')
  if (fallback && cookies.length === 0) cookies.push(fallback)
  const session = cookies.find((cookie) => cookie.includes('pierre.session_token='))
  if (!session) throw new Error('Missing Better Auth session cookie')
  return session.split(';', 1)[0]!
}

it('GET /ai/boot uses the Better Auth session and lists assigned chatbots', async () => {
  const login = await app.request('/auth/sign-in/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '198.51.100.201'
    },
    body: JSON.stringify({
      email: 'boot-test@pierre-ia.org',
      password: 'boot-test-pw'
    })
  })

  expect(login.status).toBe(200)
  const cookie = sessionCookie(login)
  expect(await getAuth().api.getSession({ headers: new Headers({ cookie }) })).not.toBeNull()

  const response = await app.request('/ai/boot', {
    headers: { cookie }
  })
  expect(response.status).toBe(200)

  const boot = (await response.json()) as {
    configId: string
    displayableConfigs: { id: string }[]
  }
  const ids = boot.displayableConfigs.map(({ id }) => id).sort()
  expect(ids).toEqual(['demo', 'testing_purpose_1', 'testing_purpose_2'].sort())
  expect(ids).not.toContain('default')
  expect(ids).not.toContain('zmode')
  expect(boot.configId).toBe('demo')
})

it('rejects authenticated users without an assigned chatbot profile', async () => {
  const denied = new Hono<{ Variables: { user: User } }>()
  denied.use('*', async (c, next) => {
    c.set('user', {
      email: 'without-chatbot@pierre-ia.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: []
    })
    await next()
  })
  denied.get('/ai/boot', get_ai_boot)

  const response = await denied.request('/ai/boot')
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({
    error: { code: 'forbidden', message: 'Chatbot configuration access denied' }
  })
})

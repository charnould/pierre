import { afterAll, beforeAll, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { Hono } from 'hono'
import { getSignedCookie } from 'hono/cookie'

import { BUSINESS_MODULE_IDS } from '../../../../../shared/modules'
import { controller as post_admin_login } from '../../../../controllers/admin/auth/post.login'
import { controller as get_ai_boot } from '../../../../controllers/ai/get.boot'
import { User, type User as UserType } from '../../../../utils/_schema'
import { authenticate, decrypt } from '../../../../utils/authenticate-user'
import { deleteAllUsers, getUser, saveUser } from '../../../../utils/handle-user'
import { CUSTOMIZATION_DIR, setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'

const app = new Hono()
app.post('/a/login', post_admin_login)
app.get('/ai/boot', authenticate, get_ai_boot)

const paths = testDatastorePaths('ai_boot')
const root = paths.root

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(root, { recursive: true, force: true })
  await setup()
  Bun.env['AUTH_SECRET'] ??= '0123456789abcdef0123456789abcdef'
  await deleteAllUsers()

  await saveUser(
    User.parse({
      email: 'boot-test@pierre-ia.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['demo', 'testing_purpose_1', 'testing_purpose_2'],
      passwordHash: await Bun.password.hash('boot-test-pw')
    })
  )
})

afterAll(async () => {
  await deleteAllUsers()
  setDatastoreRoot(null)
  await rm(root, { recursive: true, force: true })
})

function cookieFromLoginResponse(res: Response): string {
  const setCookie = res.headers.getSetCookie?.() ?? []
  if (setCookie.length === 0) {
    const raw = res.headers.get('set-cookie')
    if (raw) setCookie.push(raw)
  }
  const pierre = setCookie.find((c) => c.startsWith('pierre-ia='))
  if (!pierre) {
    throw new Error(
      `Missing pierre-ia cookie from login (status ${res.status}, location ${res.headers.get('location')})`
    )
  }
  return pierre.split(';', 1)[0]!
}

it('GET /ai/boot lists chatbots from user.chatbotIds, not default.show only', async () => {
  const loginRes = await app.fetch(
    new Request('http://localhost/a/login?client=desktop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Pierre-Client': 'desktop'
      },
      body: new URLSearchParams({
        email: 'boot-test@pierre-ia.org',
        password: 'boot-test-pw',
        action: 'login'
      }),
      redirect: 'manual'
    })
  )

  expect(loginRes.status).toBe(200)

  const cookie = cookieFromLoginResponse(loginRes)
  const cookieInspector = new Hono()
  cookieInspector.get('/', async (c) => {
    const encrypted = await getSignedCookie(c, Bun.env['AUTH_SECRET']!, 'pierre-ia')
    return c.json(JSON.parse(await decrypt(encrypted as string, Bun.env['AUTH_SECRET']!)))
  })
  expect(
    await (
      await cookieInspector.request('/', {
        headers: { Cookie: cookie }
      })
    ).json()
  ).toEqual({ email: 'boot-test@pierre-ia.org' })

  const bootRes = await app.fetch(
    new Request('http://localhost/ai/boot', {
      headers: { Cookie: cookie }
    })
  )

  expect(bootRes.ok).toBe(true)
  const boot = (await bootRes.json()) as {
    configId: string
    displayableConfigs: { id: string }[]
  }
  const ids = boot.displayableConfigs.map((c) => c.id).sort()

  expect(ids).toEqual(['demo', 'testing_purpose_1', 'testing_purpose_2'].sort())
  expect(ids).not.toContain('default')
  expect(ids).not.toContain('zmode')
  expect(boot.configId).toBe('demo')
})

it('bootstraps the root user with every business module and chatbot', async () => {
  const password = Bun.env['AUTH_PASSWORD']
  if (!password) throw new Error('AUTH_PASSWORD is required')

  const response = await app.request('/a/login?client=desktop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      email: 'admin@pierre-ia.org',
      password,
      action: 'login'
    })
  })

  expect(response.status).toBe(200)
  const root = await getUser('admin@pierre-ia.org')
  expect(root?.isAdministrator).toBe(true)
  expect(root?.moduleIds).toEqual(BUSINESS_MODULE_IDS)
  expect(root?.chatbotIds).toEqual(
    (await readdir(join(CUSTOMIZATION_DIR, 'chatbots')))
      .filter((entry) => existsSync(join(CUSTOMIZATION_DIR, 'chatbots', entry, 'config.ts')))
      .sort()
  )
})

it('rejects authenticated users without an assigned chatbot profile', async () => {
  const denied = new Hono<{ Variables: { user: UserType } }>()
  denied.use('*', async (c, next) => {
    c.set('user', {
      email: 'without-chatbot@pierre-ia.org',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: [],
      passwordHash: 'unused'
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

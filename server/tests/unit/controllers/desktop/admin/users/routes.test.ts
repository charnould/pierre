import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as deleteUserController } from '../../../../../../controllers/desktop/admin/users/delete'
import { controller as getUsersController } from '../../../../../../controllers/desktop/admin/users/get'
import { controller as patchUserController } from '../../../../../../controllers/desktop/admin/users/patch'
import { controller as postUserController } from '../../../../../../controllers/desktop/admin/users/post'
import { controller as importUsersController } from '../../../../../../controllers/desktop/admin/users/post.import'
import type { User } from '../../../../../../utils/_schema'
import { getAuth } from '../../../../../../utils/auth'
import { authorizeAdministrator } from '../../../../../../utils/authorize-role'
import { deleteAllUsers, getUser, getUsers } from '../../../../../../utils/handle-user'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../../utils/paths'
import { setup } from '../../../../../../utils/setup'
import { createTestUser } from '../../../../../test-user'

const paths = testDatastorePaths('desktop_admin_users')

const ADMIN: User = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: ['tickets', 'repayment'],
  chatbotIds: ['default']
}
const NON_ADMIN: User = {
  ...ADMIN,
  email: 'user@example.org',
  isAdministrator: false
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  const actor = c.req.header('x-test-user')
  if (actor === 'admin') c.set('user', ADMIN)
  if (actor === 'user') c.set('user', NON_ADMIN)
  await next()
})
app.get('/desktop/admin/users', authorizeAdministrator, getUsersController)
app.post('/desktop/admin/users', authorizeAdministrator, postUserController)
app.post('/desktop/admin/users/import', authorizeAdministrator, importUsersController)
app.patch('/desktop/admin/users/:email', authorizeAdministrator, patchUserController)
app.delete('/desktop/admin/users/:email', authorizeAdministrator, deleteUserController)

let adminCookie = ''
let requestIp = 1
const nextIp = (): string => {
  requestIp += 1
  return `198.51.100.${requestIp}`
}

const request = (path: string, init: RequestInit = {}, actor: 'admin' | 'user' | null = 'admin') =>
  app.request(path, {
    ...init,
    headers: {
      ...(actor ? { 'x-test-user': actor } : {}),
      ...(actor === 'admin' ? { cookie: adminCookie } : {}),
      ...init.headers
    }
  })

const jsonRequest = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

const canSignIn = async (email: string, password: string): Promise<boolean> =>
  (
    await getAuth().handler(
      new Request('http://localhost/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': nextIp()
        },
        body: JSON.stringify({ email, password })
      })
    )
  ).ok

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

beforeEach(async () => {
  await deleteAllUsers()
  await createTestUser(ADMIN, 'admin-password')
  const login = await getAuth().handler(
    new Request('http://localhost/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': nextIp()
      },
      body: JSON.stringify({ email: ADMIN.email, password: 'admin-password' })
    })
  )
  adminCookie =
    login.headers
      .getSetCookie()
      .find((cookie) => cookie.includes('pierre.session_token='))
      ?.split(';', 1)[0] ?? ''
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('desktop administrator users API', () => {
  it('requires an authenticated administrator', async () => {
    expect((await request('/desktop/admin/users', {}, null)).status).toBe(401)
    expect((await request('/desktop/admin/users', {}, 'user')).status).toBe(403)
  })

  it('lists users and access catalogues without authentication storage fields', async () => {
    const response = await request('/desktop/admin/users')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: {
        users: Array<Record<string, unknown>>
        modules: Array<{ id: string }>
        chatbots: Array<{ id: string }>
      }
    }
    expect(body.data.users).toEqual([
      {
        email: ADMIN.email,
        isAdministrator: true,
        moduleIds: ADMIN.moduleIds,
        chatbotIds: ADMIN.chatbotIds
      }
    ])
    expect(body.data.modules.some(({ id }) => id === 'tickets')).toBe(true)
    expect(body.data.chatbots.some(({ id }) => id === 'default')).toBe(true)
  })

  it('creates users with the explicit password', async () => {
    const manual = await request(
      '/desktop/admin/users',
      jsonRequest('POST', {
        email: ' Alice@Example.org ',
        password: ' manual-password ',
        isAdministrator: false,
        moduleIds: ['tickets'],
        chatbotIds: ['default']
      })
    )
    expect(manual.status).toBe(201)
    expect(await canSignIn('alice@example.org', ' manual-password ')).toBe(true)
    expect(await manual.json()).toMatchObject({
      data: { user: { email: 'alice@example.org' } }
    })
    expect(
      (
        await request(
          '/desktop/admin/users',
          jsonRequest('POST', {
            email: 'without-password@example.org',
            isAdministrator: false,
            moduleIds: [],
            chatbotIds: []
          })
        )
      ).status
    ).toBe(400)
    expect(
      (
        await request(
          '/desktop/admin/users',
          jsonRequest('POST', {
            email: 'short-password@example.org',
            password: 'short',
            isAdministrator: false,
            moduleIds: [],
            chatbotIds: []
          })
        )
      ).status
    ).toBe(400)
  })

  it('rejects duplicates and unknown module or chatbot ids', async () => {
    const duplicate = await request(
      '/desktop/admin/users',
      jsonRequest('POST', {
        email: ADMIN.email,
        password: 'password',
        isAdministrator: true,
        moduleIds: [],
        chatbotIds: []
      })
    )
    expect(duplicate.status).toBe(409)

    const invalidModule = await request(
      '/desktop/admin/users',
      jsonRequest('POST', {
        email: 'invalid-module@example.org',
        password: 'password',
        isAdministrator: false,
        moduleIds: ['unknown'],
        chatbotIds: []
      })
    )
    expect(invalidModule.status).toBe(400)

    const invalidChatbot = await request(
      '/desktop/admin/users',
      jsonRequest('POST', {
        email: 'invalid-chatbot@example.org',
        password: 'password',
        isAdministrator: false,
        moduleIds: [],
        chatbotIds: ['unknown']
      })
    )
    expect(invalidChatbot.status).toBe(400)
  })

  it('updates access without changing the password and accepts an explicit replacement', async () => {
    const existing = { ...NON_ADMIN }
    await createTestUser(existing, 'original-password')

    const access = await request(
      `/desktop/admin/users/${encodeURIComponent(existing.email)}`,
      jsonRequest('PATCH', {
        moduleIds: ['automations'],
        chatbotIds: ['demo'],
        isAdministrator: true
      })
    )
    expect(access.status).toBe(200)
    const updated = (await getUser(existing.email))!
    expect(updated).toMatchObject({
      moduleIds: ['automations'],
      chatbotIds: ['demo'],
      isAdministrator: true
    })
    expect(await canSignIn(existing.email, 'original-password')).toBe(true)

    const password = await request(
      `/desktop/admin/users/${encodeURIComponent(existing.email)}`,
      jsonRequest('PATCH', { password: 'replacement-password' })
    )
    expect(password.status).toBe(200)
    expect(await canSignIn(existing.email, 'replacement-password')).toBe(true)
  })

  it('prevents self deletion and self demotion', async () => {
    expect(
      (
        await request(
          `/desktop/admin/users/${encodeURIComponent(ADMIN.email)}`,
          jsonRequest('PATCH', { isAdministrator: false })
        )
      ).status
    ).toBe(409)
    expect(
      (
        await request(`/desktop/admin/users/${encodeURIComponent(ADMIN.email)}`, {
          method: 'DELETE'
        })
      ).status
    ).toBe(409)
    expect(await getUser(ADMIN.email)).toBeDefined()
  })

  it('deletes another user explicitly', async () => {
    await createTestUser(NON_ADMIN)
    const response = await request(`/desktop/admin/users/${encodeURIComponent(NON_ADMIN.email)}`, {
      method: 'DELETE'
    })
    expect(response.status).toBe(200)
    expect(await getUser(NON_ADMIN.email)).toBeUndefined()
  })

  it('imports CSV atomically, preserving existing access and absent users', async () => {
    const existing = { ...NON_ADMIN }
    const absent = { ...NON_ADMIN, email: 'absent@example.org' }
    await createTestUser(existing, 'old-password')
    await createTestUser(absent)

    const form = new FormData()
    form.set(
      'file',
      new File(['user@example.org,new-password\nnew@example.org,created-password'], 'users.csv', {
        type: 'text/csv'
      })
    )
    const response = await request('/desktop/admin/users/import', {
      method: 'POST',
      body: form
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: { created: 1, updated: 1 } })
    expect(await canSignIn(existing.email, 'new-password')).toBe(true)
    expect(await getUser(existing.email)).toMatchObject({
      moduleIds: existing.moduleIds,
      chatbotIds: existing.chatbotIds
    })
    expect(await getUser(absent.email)).toBeDefined()
    expect(await getUser('new@example.org')).toMatchObject({
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: []
    })
  })

  it('rejects every invalid CSV row without partial writes', async () => {
    const form = new FormData()
    form.set(
      'file',
      new File(['valid@example.org,password\nshort@example.org,x'], 'users.csv', {
        type: 'text/csv'
      })
    )
    const response = await request('/desktop/admin/users/import', {
      method: 'POST',
      body: form
    })
    expect(response.status).toBe(400)
    expect((await response.json()) as object).toMatchObject({
      error: { code: 'invalid_csv', details: [{ row: 2 }] }
    })
    expect((await getUsers()).map(({ email }) => email)).toEqual([ADMIN.email])
  })

  it('rejects changing the current administrator password through CSV', async () => {
    const form = new FormData()
    form.set('file', new File([`${ADMIN.email},replacement`], 'users.csv', { type: 'text/csv' }))
    const response = await request('/desktop/admin/users/import', {
      method: 'POST',
      body: form
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'invalid_csv',
        details: [{ row: 1, message: expect.stringContaining('propre mot de passe') }]
      }
    })
  })
})

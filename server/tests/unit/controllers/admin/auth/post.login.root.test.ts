import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../../controllers/admin/auth/post.login'
import { getUser, saveUser } from '../../../../../utils/handle-user'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('root_login')
const originalPassword = Bun.env['AUTH_PASSWORD']
const originalSecret = Bun.env['AUTH_SECRET']

const app = new Hono()
app.post('/a/login', controller)

const login = (email: string, password: string) =>
  app.request('/a/login?client=desktop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ email, password, action: 'login' })
  })

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  Bun.env['AUTH_PASSWORD'] = 'bootstrap-password'
  Bun.env['AUTH_SECRET'] = '0123456789abcdef0123456789abcdef'
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  if (originalPassword === undefined) delete Bun.env['AUTH_PASSWORD']
  else Bun.env['AUTH_PASSWORD'] = originalPassword
  if (originalSecret === undefined) delete Bun.env['AUTH_SECRET']
  else Bun.env['AUTH_SECRET'] = originalSecret
})

describe('root login bootstrap', () => {
  test('uses AUTH_PASSWORD only to create the account, then honors its stored hash', async () => {
    const bootstrap = await login(' ADMIN@PIERRE-IA.ORG ', 'bootstrap-password')
    expect(bootstrap.status).toBe(200)
    const rootUser = (await getUser('admin@pierre-ia.org'))!
    expect(rootUser.isAdministrator).toBe(true)
    expect(rootUser.moduleIds).toContain('tickets')

    await saveUser({
      ...rootUser,
      passwordHash: await Bun.password.hash('changed-password')
    })

    expect((await login(rootUser.email, 'bootstrap-password')).status).toBe(401)
    expect((await login(rootUser.email, 'changed-password')).status).toBe(200)
  })
})

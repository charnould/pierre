import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as deleteAutomation } from '../../../../../controllers/desktop/automations/delete'
import { controller as deletePin } from '../../../../../controllers/desktop/automations/delete.pin'
import { controller as getAutomations } from '../../../../../controllers/desktop/automations/get'
import { controller as patchAutomation } from '../../../../../controllers/desktop/automations/patch'
import { controller as postAutomation } from '../../../../../controllers/desktop/automations/post'
import { controller as postPin } from '../../../../../controllers/desktop/automations/post.pin'
import { controller as postRun } from '../../../../../controllers/desktop/automations/post.run'
import type { Parsed_User } from '../../../../../utils/_schema'
import { authorize_mutation } from '../../../../../utils/authorize-role'
import {
  reset_automation_executor,
  set_automation_executor
} from '../../../../../utils/automations/run'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const SERVICE = '_test_automation_routes'
const TEST_PATHS = datastorePaths(SERVICE)
const ROOT = TEST_PATHS.root
const originalService = Bun.env['SERVICE']

const app = new Hono<{ Variables: { user: Parsed_User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: c.req.header('x-test-email') ?? 'alice@example.org',
    role: (c.req.header('x-test-role') as Parsed_User['role']) ?? 'contributor',
    config: ['default'],
    password_hash: 'unused'
  })
  await next()
})
app.get('/desktop/automations', getAutomations)
app.post('/desktop/automations', authorize_mutation, postAutomation)
app.patch('/desktop/automations/:id', authorize_mutation, patchAutomation)
app.delete('/desktop/automations/:id', authorize_mutation, deleteAutomation)
app.post('/desktop/automations/:id/run', authorize_mutation, postRun)
app.post('/desktop/automations/:id/pin', authorize_mutation, postPin)
app.delete('/desktop/automations/:id/pin', authorize_mutation, deletePin)

const reportBody = {
  type: 'report',
  name: 'Rapport impayés',
  description: 'Synthèse',
  mentions: ['bob'],
  frequency: 'daily',
  frequencyTime: '08:30',
  prompt: '# Faire une synthèse',
  maxReports: 3
}

const request = (method: string, body?: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
})

const seedUsers = () => {
  const db = new Database(TEST_PATHS.database)
  const insert = db.prepare(
    "INSERT INTO users (config, email, role, password_hash) VALUES ('default', ?, 'contributor', 'x')"
  )
  insert.run('alice@example.org')
  insert.run('bob@example.org')
  db.close()
}

const create = async () => {
  const response = await app.request('/desktop/automations', request('POST', reportBody))
  expect(response.status).toBe(201)
  return (await response.json()) as { data: { id: string } }
}

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
})

beforeEach(async () => {
  await rm(ROOT, { recursive: true, force: true })
  await setup()
  reset_automation_executor()
  set_automation_executor(async () => ({ kind: 'report', contenu: '<p>Rapport de test</p>' }))
  seedUsers()
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

describe('automation route classes', () => {
  it('creates, lists, patches, pins, runs, unpins and deletes an owned automation', async () => {
    const created = await create()

    const listedForMention = await app.request('/desktop/automations', {
      headers: { 'x-test-email': 'bob@example.org' }
    })
    expect(listedForMention.status).toBe(200)
    expect((await listedForMention.json()) as unknown).toMatchObject({
      data: [{ id: created.data.id, pinned: false }]
    })

    const pinned = await app.request(
      `/desktop/automations/${created.data.id}/pin`,
      request('POST', undefined, { 'x-test-email': 'bob@example.org' })
    )
    expect(pinned.status).toBe(200)
    expect((await pinned.json()) as unknown).toMatchObject({ data: { pinned: true } })

    const patched = await app.request(
      `/desktop/automations/${created.data.id}`,
      request('PATCH', { name: 'Rapport révisé', status: 'paused' })
    )
    expect(patched.status).toBe(200)
    expect((await patched.json()) as unknown).toMatchObject({
      data: { name: 'Rapport révisé', status: 'paused', next_run_at: null }
    })

    const run = await app.request(`/desktop/automations/${created.data.id}/run`, request('POST'))
    expect(run.status).toBe(200)
    expect((await run.json()) as unknown).toMatchObject({
      data: { status: 'paused', last_run_status: 'success' }
    })

    const unpinned = await app.request(
      `/desktop/automations/${created.data.id}/pin`,
      request('DELETE', undefined, { 'x-test-email': 'bob@example.org' })
    )
    expect(unpinned.status).toBe(200)
    expect((await unpinned.json()) as unknown).toMatchObject({ data: { pinned: false } })

    const deleted = await app.request(`/desktop/automations/${created.data.id}`, request('DELETE'))
    expect(deleted.status).toBe(200)
    expect((await app.request('/desktop/automations')).status).toBe(200)
    expect(await (await app.request('/desktop/automations')).json()).toEqual({ data: [] })
  })

  it('enforces ownership, visibility and route RBAC', async () => {
    const created = await create()

    for (const [method, suffix, body] of [
      ['PATCH', '', { name: 'Usurpation' }],
      ['DELETE', '', undefined],
      ['POST', '/run', undefined]
    ] as const) {
      const response = await app.request(
        `/desktop/automations/${created.data.id}${suffix}`,
        request(method, body, { 'x-test-email': 'bob@example.org' })
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden' } })
    }
    const collidingLogin = await app.request(
      `/desktop/automations/${created.data.id}`,
      request('PATCH', { name: 'Usurpation' }, { 'x-test-email': 'alice@other.org' })
    )
    expect(collidingLogin.status).toBe(404)

    const hidden = await app.request('/desktop/automations', {
      headers: { 'x-test-email': 'charlie@example.org' }
    })
    expect(await hidden.json()).toEqual({ data: [] })

    for (const [method, path, body] of [
      ['POST', '/desktop/automations', reportBody],
      ['PATCH', `/desktop/automations/${created.data.id}`, { name: 'Non' }],
      ['DELETE', `/desktop/automations/${created.data.id}`, undefined],
      ['POST', `/desktop/automations/${created.data.id}/run`, undefined],
      ['POST', `/desktop/automations/${created.data.id}/pin`, undefined],
      ['DELETE', `/desktop/automations/${created.data.id}/pin`, undefined]
    ] as const) {
      const response = await app.request(
        path,
        request(method, body, { 'x-test-role': 'collaborator' })
      )
      expect(response.status).toBe(403)
    }
  })

  it('returns stable errors for malformed and missing resources', async () => {
    const invalid = await app.request(
      '/desktop/automations',
      request('POST', { ...reportBody, frequencyTime: '25:00' })
    )
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ error: { code: 'invalid_body' } })

    for (const [method, suffix] of [
      ['PATCH', ''],
      ['DELETE', ''],
      ['POST', '/run'],
      ['POST', '/pin'],
      ['DELETE', '/pin']
    ] as const) {
      const response = await app.request(
        `/desktop/automations/missing${suffix}`,
        request(method, method === 'PATCH' ? { name: 'Absent' } : undefined)
      )
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ error: { code: 'not_found' } })
    }
  })

  it('refuses to run when no real executor is configured', async () => {
    const created = await create()
    reset_automation_executor()
    const response = await app.request(
      `/desktop/automations/${created.data.id}/run`,
      request('POST')
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'unavailable' } })
  })
})

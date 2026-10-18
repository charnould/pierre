import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { statSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { getProviders, putProviders } from '../../../../controllers/desktop/providers'
import type { User } from '../../../../utils/_schema'
import { authorizeAdministrator } from '../../../../utils/authorize-role'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import {
  emptyProviders,
  providersPath,
  readProviders,
  writeProviders
} from '../../../../utils/providers'

const paths = testDatastorePaths('providers_admin')
const adminUser: User = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: [],
  chatbotIds: []
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', adminUser)
  await next()
})
app.get('/desktop/admin/providers', authorizeAdministrator, getProviders)
app.put('/desktop/admin/providers', authorizeAdministrator, putProviders)

const guest = new Hono<{ Variables: { user: User } }>()
guest.use('*', async (c, next) => {
  c.set('user', { ...adminUser, isAdministrator: false })
  await next()
})
guest.put('/desktop/admin/providers', authorizeAdministrator, putProviders)

const put = (body: unknown) =>
  app.request('/desktop/admin/providers', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(() => {
  writeProviders(emptyProviders())
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('prestataires', () => {
  it('n’affiche aucun secret et refuse un non-administrateur', async () => {
    const response = await app.request('/desktop/admin/providers')
    const body = await response.json()
    expect(JSON.stringify(body)).not.toContain('apiKey')
    expect(body.data.ai.configured).toBe(false)
    expect(body.data.webhooks.rcs).toContain('/webhook/rcs')
    const forbidden = await guest.request('/desktop/admin/providers', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    })
    expect(forbidden.status).toBe(403)
  })

  it('n’écrit pas une clé refusée', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    )
    const response = await put({
      group: 'ai',
      aiType: 'openai',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiApiKey: 'sk-refused'
    })
    fetchSpy.mockRestore()
    expect(response.status).toBe(400)
    expect(readProviders().aiApiKey).toBe('')
  })

  it('enregistre l’intelligence sans la renvoyer', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    const response = await put({
      group: 'ai',
      aiType: 'openai',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiApiKey: 'sk-ok'
    })
    fetchSpy.mockRestore()
    expect(response.status).toBe(200)
    expect(JSON.stringify(await response.json())).not.toContain('sk-ok')
    const listed = await (await app.request('/desktop/admin/providers')).json()
    expect(listed.data.ai).toEqual({
      configured: true,
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1'
    })
    expect((statSync(providersPath()).mode & 0o777) === 0o600).toBe(true)
  })

  it('montre le secret RCS une seule fois, puis seulement sur régénération', async () => {
    const token = '00000000-0000-0000-0000-000000000001'
    const first = await put({ group: 'rcs', rcsToken: token, rcsFrom: 'BAILLEUR' })
    const created = await first.json()
    expect(created.data.rcsSecret.length).toBeGreaterThanOrEqual(32)
    const again = await put({ group: 'rcs', rcsToken: token, rcsFrom: 'BAILLEUR' })
    expect(await again.json()).toEqual({ data: {} })
    const rotated = await put({ group: 'rcs', regenerateSecret: true })
    const next = await rotated.json()
    expect(next.data.rcsSecret).not.toBe(created.data.rcsSecret)
    expect(
      JSON.stringify(await (await app.request('/desktop/admin/providers')).json())
    ).not.toContain(next.data.rcsSecret)
  })

  it('exige le groupe email complet et n’en renvoie pas le secret', async () => {
    const missing = await put({ group: 'email', emailDomain: 'dribble.football' })
    expect(missing.status).toBe(400)
    const saved = await put({
      group: 'email',
      emailDomain: 'dribble.football',
      emailToken: '00000000-0000-0000-0000-000000000001',
      emailAccount: '00000000-0000-0000-0000-000000000002',
      emailSecret: 'signing-key'
    })
    expect(await saved.json()).toEqual({ data: {} })
    expect(readProviders().emailSecret).toBe('signing-key')
  })
})

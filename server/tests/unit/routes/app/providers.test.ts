import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { statSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { getProviders, putProviders } from '../../../../routes/admin/providers'
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
app.get('/admin/providers', authorizeAdministrator, getProviders)
app.put('/admin/providers', authorizeAdministrator, putProviders)

const guest = new Hono<{ Variables: { user: User } }>()
guest.use('*', async (c, next) => {
  c.set('user', { ...adminUser, isAdministrator: false })
  await next()
})
guest.put('/admin/providers', authorizeAdministrator, putProviders)

const put = (body: unknown) =>
  app.request('/admin/providers', {
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
    const response = await app.request('/admin/providers')
    const body = await response.json()
    expect(JSON.stringify(body)).not.toContain('apiKey')
    expect(body.data.ai.configured).toBe(false)
    expect(body.data.email).toEqual({ configured: false, domain: '', account: '' })
    expect(body.data.rcs).toEqual({ configured: false, from: '', secret: '' })
    expect(body.data.webhooks.rcs).toContain('/webhooks/rcs')
    const forbidden = await guest.request('/admin/providers', {
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
      llmType: 'openai',
      llmBaseUrl: 'https://api.openai.com/v1',
      llmApiKey: 'sk-refused',
      llmModel: 'gpt-5.5',
      llmEffort: 'medium'
    })
    fetchSpy.mockRestore()
    expect(response.status).toBe(400)
    expect(readProviders().llmApiKey).toBe('')
  })

  it('enregistre l’intelligence sans la renvoyer', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    const response = await put({
      group: 'ai',
      llmType: 'openai',
      llmBaseUrl: 'https://api.openai.com/v1',
      llmApiKey: 'sk-ok',
      llmModel: 'gpt-5.5',
      llmEffort: 'medium'
    })
    fetchSpy.mockRestore()
    expect(response.status).toBe(200)
    expect(JSON.stringify(await response.json())).not.toContain('sk-ok')
    const listed = await (await app.request('/admin/providers')).json()
    expect(listed.data.ai).toEqual({
      configured: true,
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.5',
      effort: 'medium'
    })
    expect((statSync(providersPath()).mode & 0o777) === 0o600).toBe(true)
  })

  it('conserve le secret RCS et le renvoie à la lecture', async () => {
    const token = '00000000-0000-0000-0000-000000000001'
    const first = await put({ group: 'rcs', rcsToken: token, rcsFrom: 'BAILLEUR' })
    const created = await first.json()
    expect(created.data.rcsSecret.length).toBeGreaterThanOrEqual(32)
    const again = await put({ group: 'rcs', rcsToken: token, rcsFrom: 'BAILLEUR' })
    expect(await again.json()).toEqual({ data: {} })
    const kept = await put({ group: 'rcs', rcsToken: '', rcsFrom: 'AUTRE' })
    expect(await kept.json()).toEqual({ data: {} })
    expect(readProviders().rcsToken).toBe(token)
    expect(readProviders().rcsFrom).toBe('AUTRE')
    expect(readProviders().rcsSecret).toBe(created.data.rcsSecret)
    const listed = await (await app.request('/admin/providers')).json()
    expect(listed.data.rcs.secret).toBe(created.data.rcsSecret)
    const rotated = await put({ group: 'rcs', regenerateSecret: true })
    const next = await rotated.json()
    expect(next.data.rcsSecret).not.toBe(created.data.rcsSecret)
    const after = await (await app.request('/admin/providers')).json()
    expect(after.data.rcs.secret).toBe(next.data.rcsSecret)
    const chosen = 'ab'.repeat(32)
    const sent = await put({
      group: 'rcs',
      rcsToken: token,
      rcsFrom: 'BAILLEUR',
      rcsSecret: chosen
    })
    expect(await sent.json()).toEqual({ data: {} })
    const read = await (await app.request('/admin/providers')).json()
    expect(read.data.rcs.secret).toBe(chosen)
    const rejected = await put({
      group: 'rcs',
      rcsToken: token,
      rcsFrom: 'BAILLEUR',
      rcsSecret: 'court'
    })
    expect(rejected.status).toBe(400)
    expect(readProviders().rcsSecret).toBe(chosen)
  })

  it('garde la clé et change le modèle quand le champ est vide', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    await put({
      group: 'ai',
      llmType: 'openai',
      llmBaseUrl: 'https://api.openai.com/v1',
      llmApiKey: 'sk-ok',
      llmModel: 'gpt-5.5',
      llmEffort: 'medium'
    })
    fetchSpy.mockClear()
    const response = await put({
      group: 'ai',
      llmType: 'openai',
      llmBaseUrl: 'https://api.openai.com/v1',
      llmApiKey: '',
      llmModel: 'gpt-5.5',
      llmEffort: 'xhigh'
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    expect(response.status).toBe(200)
    expect(readProviders()).toMatchObject({
      llmApiKey: 'sk-ok',
      llmModel: 'gpt-5.5',
      llmEffort: 'xhigh'
    })
  })

  it('refuse un type hors des trois valeurs', async () => {
    writeFileSync(providersPath(), `${JSON.stringify({ llmType: 'nope', llmApiKey: 'sk' })}\n`)
    expect(readProviders()).toMatchObject({ llmType: '', llmApiKey: 'sk' })
    const response = await put({
      group: 'ai',
      llmType: 'other',
      llmBaseUrl: 'https://api.openai.com/v1',
      llmApiKey: 'sk-ok',
      llmModel: 'gpt-5.5',
      llmEffort: 'medium'
    })
    expect(response.status).toBe(400)
  })

  it('enregistre openai-compatible et le sonde en Bearer', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    const response = await put({
      group: 'ai',
      llmType: 'openai-compatible',
      llmBaseUrl: 'https://api.mistral.ai/v1',
      llmApiKey: 'sk-ok',
      llmModel: 'mistral-small-latest',
      llmEffort: 'high'
    })
    const call = fetchSpy.mock.calls[0]
    fetchSpy.mockRestore()
    expect(response.status).toBe(200)
    expect(readProviders().llmType).toBe('openai-compatible')
    expect(call?.[0]).toBe('https://api.mistral.ai/v1/models')
    expect((call?.[1] as RequestInit | undefined)?.headers).toMatchObject({
      authorization: 'Bearer sk-ok'
    })
    const listed = await (await app.request('/admin/providers')).json()
    expect(listed.data.ai.type).toBe('openai-compatible')
    expect(JSON.stringify(listed)).not.toContain('sk-ok')
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
    const kept = await put({
      group: 'email',
      emailDomain: 'dribble.football',
      emailToken: '',
      emailAccount: '00000000-0000-0000-0000-000000000002',
      emailSecret: ''
    })
    expect(kept.status).toBe(200)
    expect(readProviders().emailToken).toBe('00000000-0000-0000-0000-000000000001')
    expect(readProviders().emailSecret).toBe('signing-key')
    const listed = await (await app.request('/admin/providers')).json()
    expect(listed.data.email).toEqual({
      configured: true,
      domain: 'dribble.football',
      account: '00000000-0000-0000-0000-000000000002'
    })
    expect(JSON.stringify(listed)).not.toContain('signing-key')
  })
})

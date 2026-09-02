import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as deleteActivity } from '../../../../../controllers/desktop/activities/delete'
import { controller as patchActivity } from '../../../../../controllers/desktop/activities/patch'
import { controller as postActivity } from '../../../../../controllers/desktop/activities/post'
import type { Parsed_User } from '../../../../../utils/_schema'
import { get_activity } from '../../../../../utils/activities/rows'
import { authorize_mutation } from '../../../../../utils/authorize-role'
import { setup } from '../../../../../utils/setup'
import { get_ticket_draft, upsert_ticket_draft } from '../../../../../utils/ticket-activities'

const SERVICE = '_test_activity_write_controllers'
const ROOT = `datastores/${SERVICE}`
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
app.post('/desktop/activities', authorize_mutation, postActivity)
app.patch('/desktop/activities/:id', authorize_mutation, patchActivity)
app.delete('/desktop/activities/:id', authorize_mutation, deleteActivity)

const base = {
  contexte: 'tickets',
  ref: 'TICKET-1',
  type: 'note',
  contenu: 'Bonjour'
}

const jsonRequest = (method: string, body?: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
})

beforeAll(async () => {
  Bun.env['SERVICE'] = SERVICE
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

beforeEach(async () => {
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

describe('activity write controllers', () => {
  for (const field of ['auteur', 'bulk_id', 'execution_id'] as const) {
    it(`rejects client-provided ${field}`, async () => {
      const response = await app.request(
        '/desktop/activities',
        jsonRequest('POST', {
          ...base,
          [field]: field === 'auteur' ? 'agent:spoofed' : 'spoofed'
        })
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'invalid_body' } })
    })
  }

  it('derives the author and enforces ownership for edits and deletion', async () => {
    const createdResponse = await app.request(
      '/desktop/activities',
      jsonRequest('POST', base, { 'x-test-email': 'alice@example.org' })
    )
    expect(createdResponse.status).toBe(200)
    const created = (await createdResponse.json()) as { data: { id: number; auteur: string } }
    expect(created.data.auteur).toBe('user:alice@example.org')

    for (const method of ['PATCH', 'DELETE'] as const) {
      const response = await app.request(
        `/desktop/activities/${created.data.id}`,
        jsonRequest(
          method,
          method === 'PATCH'
            ? { operation: 'edit_content', contenu: 'Tentative de Bob' }
            : undefined,
          { 'x-test-email': 'bob@example.org' }
        )
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden' } })
    }

    const edited = await app.request(
      `/desktop/activities/${created.data.id}`,
      jsonRequest('PATCH', { operation: 'edit_content', contenu: 'Corrigé' })
    )
    expect(edited.status).toBe(200)
    expect((await edited.json()) as unknown).toMatchObject({
      data: { contenu: expect.stringContaining('Corrigé') }
    })

    const deleted = await app.request(
      `/desktop/activities/${created.data.id}`,
      jsonRequest('DELETE')
    )
    expect(deleted.status).toBe(200)
    expect(get_activity(created.data.id)).toBeNull()
  })

  it('blocks collaborators from every mutation route', async () => {
    const created = await app.request('/desktop/activities', jsonRequest('POST', base))
    const id = ((await created.json()) as { data: { id: number } }).data.id
    for (const [method, path, body] of [
      ['POST', '/desktop/activities', base],
      ['PATCH', `/desktop/activities/${id}`, { operation: 'edit_content', contenu: 'Non' }],
      ['DELETE', `/desktop/activities/${id}`, undefined]
    ] as const) {
      const response = await app.request(
        path,
        jsonRequest(method, body, { 'x-test-role': 'collaborator' })
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden' } })
    }
  })

  it('runs a generated ticket draft through edit, feedback, publish and delete semantics', async () => {
    const draft = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-DRAFT',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'Version générée',
      generated_by: 'alice@example.org'
    })

    const edits = [
      { operation: 'edit_content', contenu: 'Version relue' },
      { operation: 'set_evaluation', score: 5, commentaire: 'Validé' }
    ]
    for (const body of edits) {
      const response = await app.request(
        `/desktop/activities/${draft.activity_id}`,
        jsonRequest('PATCH', body)
      )
      expect(response.status).toBe(200)
    }
    expect(get_ticket_draft('REQ-DRAFT', 'ticket.answer-ticket')).toMatchObject({
      edited_output: 'Version relue',
      feedback_rating: 5,
      feedback_comment: 'Validé'
    })

    const published = await app.request(
      `/desktop/activities/${draft.activity_id}`,
      jsonRequest('PATCH', { operation: 'set_status', statut: 'logged' })
    )
    expect(published.status).toBe(200)
    expect(get_ticket_draft('REQ-DRAFT', 'ticket.answer-ticket')).toBeNull()
    expect(
      (await app.request(`/desktop/activities/${draft.activity_id}`, jsonRequest('DELETE'))).status
    ).toBe(403)

    const disposable = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-DISPOSABLE',
      id_skill: 'ticket.write-memo',
      generated_output: 'Mémo',
      generated_by: 'alice@example.org'
    })
    expect(
      (await app.request(`/desktop/activities/${disposable.activity_id}`, jsonRequest('DELETE')))
        .status
    ).toBe(200)
    expect(get_ticket_draft('REQ-DISPOSABLE', 'ticket.write-memo')).toBeNull()
  })
})

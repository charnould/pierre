import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as deleteActivity } from '../../../../../controllers/desktop/activities/delete'
import { controller as patchActivity } from '../../../../../controllers/desktop/activities/patch'
import { controller as postActivity } from '../../../../../controllers/desktop/activities/post'
import type { User } from '../../../../../utils/_schema'
import { list_activities } from '../../../../../utils/activities/query'
import { get_activity } from '../../../../../utils/activities/rows'
import { create_activity } from '../../../../../utils/activities/write'
import { datastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const SERVICE = '_test_activity_write_controllers'
const ROOT = datastorePaths(SERVICE).root
const originalService = Bun.env['SERVICE']

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: c.req.header('x-test-email') ?? 'alice@example.org',
    isAdministrator: false,
    moduleIds: ['tickets'],
    chatbotIds: ['default'],
    passwordHash: 'unused'
  })
  await next()
})
app.post('/desktop/activities', postActivity)
app.patch('/desktop/activities/:id', patchActivity)
app.delete('/desktop/activities/:id', deleteActivity)

const base = {
  contexte: 'tickets',
  ref: 'TICKET-1',
  type: 'note.published',
  contenu: JSON.stringify({ version: 2, text: 'Bonjour' })
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
            ? {
                operation: 'edit_content',
                contenu: JSON.stringify({ version: 2, text: 'Tentative de Bob' })
              }
            : undefined,
          { 'x-test-email': 'bob@example.org' }
        )
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: { code: 'forbidden' } })
    }

    const edited = await app.request(
      `/desktop/activities/${created.data.id}`,
      jsonRequest('PATCH', {
        operation: 'edit_content',
        contenu: JSON.stringify({ version: 2, text: 'Corrigé' })
      })
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
    expect(get_activity(created.data.id)).not.toBeNull()
  })

  it('allows standard users on every mutation route', async () => {
    const created = await app.request('/desktop/activities', jsonRequest('POST', base))
    const id = ((await created.json()) as { data: { id: number } }).data.id
    for (const [method, path, body] of [
      ['POST', '/desktop/activities', base],
      [
        'PATCH',
        `/desktop/activities/${id}`,
        { operation: 'edit_content', contenu: JSON.stringify({ version: 2, text: 'Non' }) }
      ],
      ['DELETE', `/desktop/activities/${id}`, undefined]
    ] as const) {
      const response = await app.request(path, jsonRequest(method, body))
      expect(response.status).toBe(200)
    }
  })

  it('runs a generated ticket draft through edit, feedback and discard events', async () => {
    const draft = create_activity('alice@example.org', {
      contexte: 'tickets',
      ref: 'REQ-DRAFT',
      type: 'artifact.generated',
      contenu: JSON.stringify({
        version: 2,
        title: 'Réponse',
        values: {
          skill: 'ticket.answer-ticket',
          channel: 'email',
          generated_by: 'alice@example.org'
        },
        note: 'Version générée'
      })
    })

    const edits = [
      { operation: 'edit_content', contenu: 'Version relue' },
      { operation: 'set_evaluation', score: 5, commentaire: 'Validé' }
    ]
    let activityId = draft.id
    for (const body of edits) {
      const response = await app.request(
        `/desktop/activities/${activityId}`,
        jsonRequest('PATCH', body)
      )
      expect(response.status).toBe(200)
      activityId = ((await response.json()) as { data: { id: number } }).data.id
    }
    expect(JSON.parse(get_activity(activityId)!.contenu)).toMatchObject({
      note: 'Version relue',
      values: {
        generated_output: 'Version générée',
        edited_by: 'alice@example.org',
        feedback_rating: 5,
        feedback_comment: 'Validé'
      }
    })

    const discarded = await app.request(`/desktop/activities/${activityId}`, jsonRequest('DELETE'))
    expect(discarded.status).toBe(200)
    expect(
      list_activities('alice@example.org', { rattachement: 'tickets:REQ-DRAFT' })[0]?.type
    ).toBe('artifact.discarded')

    const disposable = create_activity('alice@example.org', {
      contexte: 'tickets',
      ref: 'REQ-DISPOSABLE',
      type: 'artifact.generated',
      contenu: JSON.stringify({
        version: 2,
        title: 'Mémo',
        values: {
          skill: 'ticket.write-memo',
          generated_by: 'alice@example.org'
        },
        note: 'Mémo'
      })
    })
    expect(
      (await app.request(`/desktop/activities/${disposable.id}`, jsonRequest('DELETE'))).status
    ).toBe(200)
    expect(
      list_activities('alice@example.org', {
        rattachement: 'tickets:REQ-DISPOSABLE'
      })[0]?.type
    ).toBe('artifact.discarded')
  })
})

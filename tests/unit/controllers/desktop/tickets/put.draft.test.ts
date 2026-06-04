import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as put_desktop_tickets_drafts } from '../../../../../controllers/desktop/tickets/put.draft'
import type { Parsed_User } from '../../../../../utils/_schema'
import { setup } from '../../../../../utils/setup'

const TEST_SERVICE = '_test_put_draft_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

const TEST_USER: Parsed_User = {
  email: 'tester@example.com',
  role: 'administrator',
  config: ['default'],
  password_hash: 'x'
}

const app = new Hono()
app.put('/desktop/tickets/drafts', async (c, next) => {
  c.set('user', TEST_USER)
  return put_desktop_tickets_drafts(c, next)
})

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('PUT /desktop/tickets/drafts', () => {
  it('saves generation draft with server generated_by', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_kind: 'generation',
          id_reclamation: 'REQ-9',
          id_skill: 'ticket.answer-ticket',
          channel: 'letter',
          generated_output: 'o',
          generated_reasoning: 'r',
          generated_duration_ms: 500
        })
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: boolean
      generated_by: string
      edited_by: string | null
    }
    expect(body.ok).toBe(true)
    expect(body.generated_by).toBe('tester@example.com')
    expect(body.edited_by).toBeNull()

    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    try {
      const row = db
        .query<{ generated_by: string; edited_by: string | null }, []>(
          'SELECT generated_by, edited_by FROM reclamation_drafts'
        )
        .get()
      expect(row?.generated_by).toBe('tester@example.com')
      expect(row?.edited_by).toBeNull()
    } finally {
      db.close()
    }
  })

  it('saves edit draft with server edited_by', async () => {
    await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_kind: 'generation',
          id_reclamation: 'REQ-9',
          id_skill: 'ticket.answer-ticket',
          channel: 'letter',
          generated_output: 'o'
        })
      })
    )

    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_kind: 'edit',
          id_reclamation: 'REQ-9',
          id_skill: 'ticket.answer-ticket',
          edited_output: 'eo'
        })
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { edited_by: string | null }
    expect(body.edited_by).toBe('tester@example.com')

    const db = new Database(`${DATASTORE_ROOT}/datastore.sqlite`, { readonly: true })
    try {
      const row = db
        .query<{ generated_output: string; edited_output: string }, []>(
          'SELECT generated_output, edited_output FROM reclamation_drafts'
        )
        .get()
      expect(row?.generated_output).toBe('o')
      expect(row?.edited_output).toBe('eo')
    } finally {
      db.close()
    }
  })

  it('returns 404 when editing missing draft', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_kind: 'edit',
          id_reclamation: 'REQ-404',
          id_skill: 'ticket.answer-ticket',
          edited_output: 'y'
        })
      })
    )
    expect(res.status).toBe(404)
  })

  it('rejects invalid id_skill', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          save_kind: 'generation',
          id_reclamation: 'REQ-9',
          id_skill: 'invalid',
          generated_output: ''
        })
      })
    )
    expect(res.status).toBe(400)
  })
})

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_tickets_drafts } from '../../../../../controllers/desktop/tickets/get.draft'
import { setup } from '../../../../../utils/setup'
import { upsert_ticket_draft } from '../../../../../utils/ticket-drafts'

const TEST_SERVICE = '_test_get_draft_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

const app = new Hono()
app.get('/desktop/tickets/drafts', get_desktop_tickets_drafts)

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
  upsert_ticket_draft({
    save_kind: 'generation',
    id_reclamation: 'REQ-1',
    id_skill: 'ticket.answer-ticket',
    channel: 'email',
    generated_output: 'o',
    generated_by: 'u@x.com'
  })
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('GET /desktop/tickets/drafts', () => {
  it('returns one draft by id_skill', async () => {
    const res = await app.fetch(
      new Request(
        'http://localhost/desktop/tickets/drafts?id_reclamation=REQ-1&id_skill=ticket.answer-ticket'
      )
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { generated_output: string | null } | null }
    expect(body.data?.generated_output).toBe('o')
  })

  it('lists all drafts for a ticket', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/tickets/drafts?id_reclamation=REQ-1')
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(1)
  })
})

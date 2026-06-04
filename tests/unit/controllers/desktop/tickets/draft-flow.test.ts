import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as get_desktop_tickets_drafts } from '../../../../../controllers/desktop/tickets/get.draft'
import { controller as put_desktop_tickets_drafts } from '../../../../../controllers/desktop/tickets/put.draft'
import type { Parsed_User } from '../../../../../utils/_schema'
import { setup } from '../../../../../utils/setup'

const TEST_SERVICE = '_test_draft_flow_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`

const TEST_USER_A: Parsed_User = {
  email: 'alice@example.com',
  role: 'administrator',
  config: ['default'],
  password_hash: 'x'
}

const TEST_USER_B: Parsed_User = {
  email: 'bob@example.com',
  role: 'administrator',
  config: ['default'],
  password_hash: 'x'
}

const app = new Hono()
app.put('/desktop/tickets/drafts', async (c, next) => {
  c.set('user', c.req.header('x-test-user') === 'bob' ? TEST_USER_B : TEST_USER_A)
  return put_desktop_tickets_drafts(c, next)
})
app.get('/desktop/tickets/drafts', get_desktop_tickets_drafts)

const putJson = (body: unknown, user: 'alice' | 'bob' = 'alice') =>
  app.fetch(
    new Request('http://localhost/desktop/tickets/drafts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': user
      },
      body: JSON.stringify(body)
    })
  )

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

describe('draft end-to-end flow', () => {
  it('generation then edit preserves generated_* and sets edited_*', async () => {
    expect(
      (
        await putJson({
          save_kind: 'generation',
          id_reclamation: 'REQ-FLOW',
          id_skill: 'ticket.answer-ticket',
          channel: 'email',
          generated_output: 'ia-o',
          generated_reasoning: 'think',
          generated_duration_ms: 2500
        })
      ).status
    ).toBe(200)

    expect(
      (
        await putJson(
          {
            save_kind: 'edit',
            id_reclamation: 'REQ-FLOW',
            id_skill: 'ticket.answer-ticket',
            edited_output: 'user-o'
          },
          'bob'
        )
      ).status
    ).toBe(200)

    const getRes = await app.fetch(
      new Request(
        'http://localhost/desktop/tickets/drafts?id_reclamation=REQ-FLOW&id_skill=ticket.answer-ticket'
      )
    )
    const body = (await getRes.json()) as {
      data: {
        generated_output: string
        generated_reasoning: string
        generated_duration_ms: number
        generated_by: string
        edited_output: string
        edited_by: string
      }
    }

    expect(body.data.generated_output).toBe('ia-o')
    expect(body.data.generated_reasoning).toBe('think')
    expect(body.data.generated_duration_ms).toBe(2500)
    expect(body.data.generated_by).toBe('alice@example.com')
    expect(body.data.edited_output).toBe('user-o')
    expect(body.data.edited_by).toBe('bob@example.com')
  })

  it('regeneration clears edited_* and replaces generated_*', async () => {
    await putJson({
      save_kind: 'generation',
      id_reclamation: 'REQ-R',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'o1'
    })
    await putJson({
      save_kind: 'edit',
      id_reclamation: 'REQ-R',
      id_skill: 'ticket.answer-ticket',
      edited_output: 'e2'
    })
    await putJson({
      save_kind: 'generation',
      id_reclamation: 'REQ-R',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'o2'
    })

    const getRes = await app.fetch(
      new Request(
        'http://localhost/desktop/tickets/drafts?id_reclamation=REQ-R&id_skill=ticket.answer-ticket'
      )
    )
    const body = (await getRes.json()) as {
      data: {
        generated_output: string
        edited_output: string | null
        edited_by: string | null
      }
    }
    expect(body.data.generated_output).toBe('o2')
    expect(body.data.edited_output).toBeNull()
    expect(body.data.edited_by).toBeNull()
  })
})

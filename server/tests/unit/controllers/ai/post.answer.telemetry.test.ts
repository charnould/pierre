import { beforeAll, describe, expect, it, spyOn } from 'bun:test'

import { Hono } from 'hono'

import { createPostAnswerController } from '../../../../controllers/ai/post.answer'
import type { Parsed_User } from '../../../../utils/_schema'
import { authorize_mutation } from '../../../../utils/authorize-role'
import { conversationReservationCount } from '../../../../utils/vm-registry'

const telemetryCalls: string[] = []
let streamShouldFail = false
const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'
let reservationObservedDuringStream = 0

const controller = createPostAnswerController({
  stream: async function* () {
    reservationObservedDuringStream = conversationReservationCount(CONV_ID)
    if (streamShouldFail) throw new Error('stream failed')
    yield { type: 'done' as const, fullContent: 'Réponse test' }
  },
  telemetry: (event: string) => {
    telemetryCalls.push(event)
  }
})

const app = new Hono<{ Variables: { user: Parsed_User | null } }>()
app.use('/ai/answer', async (c, next) => {
  const role = c.req.header('x-test-role')
  if (role) {
    c.set(
      'user' as never,
      {
        email: 'review@example.com',
        role,
        config: [],
        password_hash: ''
      } as never
    )
  }
  return await next()
})
app.post('/ai/answer', authorize_mutation, controller)

const answerPayload = JSON.stringify({
  version: 1,
  workflow: 'answer',
  channel: 'email',
  id_reclamation: 'REQ-1',
  message: 'Bonjour',
  context: null
})

function postAnswer(
  skill: string,
  role: 'administrator' | 'contributor' | 'collaborator' | null = 'contributor'
) {
  const formData = new FormData()
  formData.set('conv_id', CONV_ID)
  formData.set('id_skill', skill)
  formData.set('payload', answerPayload)

  return app.fetch(
    new Request('http://localhost/ai/answer', {
      method: 'POST',
      headers: role ? { 'x-test-role': role } : undefined,
      body: formData
    })
  )
}

describe('POST /ai/answer telemetry', () => {
  beforeAll(() => {
    streamShouldFail = false
    telemetryCalls.length = 0
    reservationObservedDuringStream = 0
  })

  it('emits ai.answer.<id_skill> after a successful stream', async () => {
    telemetryCalls.length = 0
    streamShouldFail = false

    const res = await postAnswer('ticket.answer-ticket')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    await res.text()

    expect(telemetryCalls).toEqual(['ai.answer.ticket.answer-ticket'])
    expect(reservationObservedDuringStream).toBe(1)
    expect(conversationReservationCount(CONV_ID)).toBe(0)
  })

  it('does not emit telemetry when the stream fails', async () => {
    telemetryCalls.length = 0
    streamShouldFail = true
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    try {
      const res = await postAnswer('about.summary')

      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).toContain('{"type":"error"}')
      expect(telemetryCalls).toEqual([])
      expect(errorSpy).toHaveBeenCalled()
      expect(conversationReservationCount(CONV_ID)).toBe(0)
    } finally {
      errorSpy.mockRestore()
      streamShouldFail = false
    }
  })

  it('rejects traversal and unknown skill IDs with structured errors', async () => {
    const traversal = await postAnswer('../ticket.answer-ticket')
    expect(traversal.status).toBe(400)
    expect(await traversal.json()).toEqual({
      error: { code: 'invalid_skill_id', message: 'Skill ID is invalid' }
    })

    const unknown = await postAnswer('ticket.does-not-exist')
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toEqual({
      error: { code: 'skill_not_found', message: 'Skill is not configured' }
    })
  })

  it('rejects anonymous requests', async () => {
    const anonymous = await postAnswer('ticket.answer-ticket', null)
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it.each(['collaborator', 'contributor', 'administrator'] as const)(
    'allows an authenticated %s',
    async (role) => {
      streamShouldFail = false
      const res = await postAnswer('ticket.answer-ticket', role)
      expect(res.status).toBe(200)
      await res.text()
    }
  )
})

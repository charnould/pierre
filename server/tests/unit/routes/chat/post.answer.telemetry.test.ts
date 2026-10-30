import { beforeAll, describe, expect, it, spyOn } from 'bun:test'

import { Hono } from 'hono'

import type { BusinessModuleId } from '../../../../../shared/modules'
import { createPostAnswerController } from '../../../../routes/workflows/generate'
import type { User } from '../../../../utils/_schema'
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

const app = new Hono<{ Variables: { user: User | null } }>()
app.use('/workflows', async (c, next) => {
  if (c.req.header('x-test-user') !== 'true') {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  c.set('user', {
    email: 'review@example.com',
    isAdministrator: false,
    moduleIds: (c.req.header('x-test-modules') ?? 'tickets,about')
      .split(',')
      .filter(Boolean) as BusinessModuleId[],
    chatbotIds: []
  })
  return await next()
})
app.post('/workflows', controller)

const answerPayload = JSON.stringify({
  id_locataire: '121284',
  year_from: 2000,
  year_to: 2029
})

function postAnswer(skill: string, authenticated = true, modules?: string) {
  const formData = new FormData()
  formData.set('conversationId', CONV_ID)
  formData.set('skillId', skill)
  formData.set('payload', answerPayload)

  return app.fetch(
    new Request('http://localhost/workflows', {
      method: 'POST',
      headers: authenticated
        ? { 'x-test-user': 'true', ...(modules === undefined ? {} : { 'x-test-modules': modules }) }
        : undefined,
      body: formData
    })
  )
}

describe('POST /workflows telemetry', () => {
  beforeAll(() => {
    streamShouldFail = false
    telemetryCalls.length = 0
    reservationObservedDuringStream = 0
  })

  it('emits ai.answer.<id_skill> after a successful stream', async () => {
    telemetryCalls.length = 0
    streamShouldFail = false

    const res = await postAnswer('about')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    const body = await res.text()
    expect(body).toContain('"type":"attachment_uploads_ready"')
    expect(body).toContain('"type":"stream_end"')

    expect(telemetryCalls).toEqual(['ai.answer.about'])
    expect(reservationObservedDuringStream).toBe(1)
    expect(conversationReservationCount(CONV_ID)).toBe(0)
  })

  it('does not emit telemetry when the stream fails', async () => {
    telemetryCalls.length = 0
    streamShouldFail = true
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    try {
      const res = await postAnswer('about')

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
    const anonymous = await postAnswer('about', false)
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it('allows an authenticated user', async () => {
    streamShouldFail = false
    const res = await postAnswer('about')
    expect(res.status).toBe(200)
    await res.text()
  })

  it('rejects a workflow whose module is not assigned', async () => {
    const res = await postAnswer('replies', true, 'about')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({
      error: { code: 'forbidden', message: 'Insufficient permissions' }
    })
  })
})

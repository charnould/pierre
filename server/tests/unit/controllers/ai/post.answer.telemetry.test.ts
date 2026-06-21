import { afterAll, beforeAll, describe, expect, it, mock, spyOn } from 'bun:test'

import { Hono } from 'hono'

const telemetryCalls: string[] = []
let streamShouldFail = false

mock.module('../../../../utils/copilot-agent', () => ({
  streamCopilot: async function* () {
    if (streamShouldFail) throw new Error('stream failed')
    yield { type: 'done' as const, fullContent: 'Réponse test' }
  }
}))

mock.module('../../../../utils/send-telemetry', () => ({
  send_telemetry: (event: string) => {
    telemetryCalls.push(event)
  }
}))

const { controller } = await import('../../../../controllers/ai/post.answer')

const app = new Hono()
app.post('/ai/answer', controller)

const answerPayload = JSON.stringify({
  version: 1,
  workflow: 'answer',
  channel: 'email',
  id_reclamation: 'REQ-1',
  message: 'Bonjour',
  context: null
})

function postAnswer(skill: string) {
  const formData = new FormData()
  formData.set('conv_id', 'conv-test')
  formData.set('id_skill', skill)
  formData.set('payload', answerPayload)

  return app.fetch(
    new Request('http://localhost/ai/answer', {
      method: 'POST',
      body: formData
    })
  )
}

describe('POST /ai/answer telemetry', () => {
  beforeAll(() => {
    streamShouldFail = false
    telemetryCalls.length = 0
  })

  afterAll(() => {
    mock.restore()
  })

  it('emits ai.answer.<id_skill> after a successful stream', async () => {
    telemetryCalls.length = 0
    streamShouldFail = false

    const res = await postAnswer('ticket.answer-ticket')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    await res.text()

    expect(telemetryCalls).toEqual(['ai.answer.ticket.answer-ticket'])
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
    } finally {
      errorSpy.mockRestore()
      streamShouldFail = false
    }
  })
})

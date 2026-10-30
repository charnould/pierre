import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import {
  createPostUiResponseController,
  MAX_UI_RESPONSE_ANSWERS,
  MAX_UI_RESPONSE_BODY_BYTES
} from '../../../../routes/chat/responses'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'
let pending:
  | {
      convId: string
      requestId: string
      responseSecret: string
      value?: string
    }
  | undefined
const forwardedValues: string[] = []

const respondToPendingUiRequest = (
  convId: string,
  requestId: string,
  responseSecret: string,
  value: string
) => {
  if (
    !pending ||
    pending.convId !== convId ||
    pending.requestId !== requestId ||
    pending.responseSecret !== responseSecret
  ) {
    return false
  }
  pending.value = value
  forwardedValues.push(value)
  pending = undefined
  return true
}

const anonymousApp = new Hono()
anonymousApp.post('/chat/responses', createPostUiResponseController(respondToPendingUiRequest))

describe('POST /chat/responses', () => {
  beforeEach(() => {
    forwardedValues.length = 0
    pending = {
      convId: CONV_ID,
      requestId: 'ui-1',
      responseSecret: 'secret-1'
    }
  })

  it('allows anonymous responses with the secret and consumes the request once', async () => {
    const body = {
      conversationId: CONV_ID,
      requestId: 'ui-1',
      responseSecret: 'secret-1',
      answers: [{ question: 'Continue?', answer: 'Yes' }]
    }
    const first = await anonymousApp.request('/chat/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const second = await anonymousApp.request('/chat/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    expect(first.status).toBe(204)
    expect(second.status).toBe(404)
    expect(await second.json()).toEqual({
      error: {
        code: 'pending_ui_request_not_found',
        message: 'Pending UI request not found'
      }
    })
    expect(forwardedValues).toEqual([JSON.stringify([{ question: 'Continue?', answer: 'Yes' }])])
  })

  it('rejects a response with the wrong capability secret', async () => {
    const response = await anonymousApp.request('/chat/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: CONV_ID,
        requestId: 'ui-1',
        responseSecret: 'wrong-secret',
        answers: [{ question: 'Continue?', answer: 'Yes' }]
      })
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'pending_ui_request_not_found',
        message: 'Pending UI request not found'
      }
    })
  })

  it('normalizes malformed JSON and invalid answers into the AI error envelope', async () => {
    for (const body of ['{', JSON.stringify({ answers: [] })]) {
      const response = await anonymousApp.request('/chat/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: { code: 'invalid_ui_response', message: 'Invalid UI response' }
      })
    }
  })

  it('rejects non-canonical or overlong correlation fields and bounded answers', async () => {
    const base = {
      conversationId: CONV_ID,
      requestId: 'ui-1',
      responseSecret: 'secret-1',
      answers: [{ question: 'Continue?', answer: 'Yes' }]
    }
    const invalidBodies = [
      { ...base, conversationId: '../conversation' },
      { ...base, requestId: 'r'.repeat(129) },
      { ...base, responseSecret: 's'.repeat(257) },
      { ...base, answers: Array(MAX_UI_RESPONSE_ANSWERS + 1).fill(base.answers[0]) },
      { ...base, answers: [{ question: 'q'.repeat(501), answer: 'Yes' }] },
      { ...base, answers: [{ question: 'Continue?', answer: 'a'.repeat(2_001) }] }
    ]

    for (const body of invalidBodies) {
      const response = await anonymousApp.request('/chat/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      expect(response.status).toBe(400)
    }
  })

  it('rejects an oversized payload with 413 before parsing', async () => {
    const response = await anonymousApp.request('/chat/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'x'.repeat(MAX_UI_RESPONSE_BODY_BYTES + 1)
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      error: { code: 'ui_response_too_large', message: 'UI response is too large' }
    })
  })
})

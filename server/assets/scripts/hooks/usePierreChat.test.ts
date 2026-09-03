import { describe, expect, test } from 'bun:test'

import { buildUiResponseBody } from './usePierreChat'

describe('web chat questionnaire responses', () => {
  test('returns the canonical one-shot capability with anonymous response payloads', () => {
    const answers = [{ question: 'Continue?', answer: 'Yes' }]
    expect(
      buildUiResponseBody(
        'conv-1',
        {
          requestId: 'request-1',
          toolCallId: 'call-1',
          responseSecret: 'secret-1',
          questions: [{ question: 'Continue?', choices: ['Yes', 'No', 'Other'] }]
        },
        answers
      )
    ).toEqual({
      conv_id: 'conv-1',
      request_id: 'request-1',
      response_secret: 'secret-1',
      answers
    })
  })
})

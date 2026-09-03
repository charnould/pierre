import type { Context } from 'hono'

import type { AskUserAnswer } from '../../../shared/ai-stream-events'
import { assertCanonicalConversationId } from '../../utils/ai-attachments'
import { respondToPendingUiRequest } from '../../utils/vm-registry'

export const MAX_UI_RESPONSE_BODY_BYTES = 32 * 1024
export const MAX_UI_RESPONSE_ANSWERS = 10
const MAX_UI_REQUEST_ID_CHARS = 128
const MAX_UI_RESPONSE_SECRET_CHARS = 256
const MAX_UI_QUESTION_CHARS = 500
const MAX_UI_ANSWER_CHARS = 2_000

function isAnswer(value: unknown): value is AskUserAnswer {
  if (typeof value !== 'object' || value === null) return false
  const answer = value as Record<string, unknown>
  return (
    typeof answer['question'] === 'string' &&
    answer['question'].trim().length > 0 &&
    answer['question'].length <= MAX_UI_QUESTION_CHARS &&
    typeof answer['answer'] === 'string' &&
    answer['answer'].trim().length > 0 &&
    answer['answer'].length <= MAX_UI_ANSWER_CHARS
  )
}

/**
 * POST /ai/ui-response
 *
 * One-shot capability bridge from web/desktop questionnaires to Pi's native
 * extension_ui_response RPC input. It deliberately does not require a cookie.
 */
export const createPostUiResponseController =
  (respond: typeof respondToPendingUiRequest = respondToPendingUiRequest) =>
  async (c: Context) => {
    const rawBody = await c.req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_UI_RESPONSE_BODY_BYTES) {
      return c.json(
        { error: { code: 'ui_response_too_large', message: 'UI response is too large' } },
        413
      )
    }

    const body = (() => {
      try {
        return JSON.parse(rawBody)
      } catch {
        return null
      }
    })() as {
      conv_id?: unknown
      request_id?: unknown
      response_secret?: unknown
      answers?: unknown
    } | null

    if (
      !body ||
      typeof body.conv_id !== 'string' ||
      !isCanonicalConversationId(body.conv_id.trim()) ||
      typeof body.request_id !== 'string' ||
      !body.request_id.trim() ||
      body.request_id.length > MAX_UI_REQUEST_ID_CHARS ||
      typeof body.response_secret !== 'string' ||
      !body.response_secret ||
      body.response_secret.length > MAX_UI_RESPONSE_SECRET_CHARS ||
      !Array.isArray(body.answers) ||
      body.answers.length === 0 ||
      body.answers.length > MAX_UI_RESPONSE_ANSWERS ||
      !body.answers.every(isAnswer)
    ) {
      return c.json({ error: { code: 'invalid_ui_response', message: 'Invalid UI response' } }, 400)
    }

    const accepted = respond(
      body.conv_id.trim(),
      body.request_id.trim(),
      body.response_secret,
      JSON.stringify(body.answers)
    )

    return accepted
      ? c.body(null, 204)
      : c.json(
          {
            error: {
              code: 'pending_ui_request_not_found',
              message: 'Pending UI request not found'
            }
          },
          404
        )
  }

function isCanonicalConversationId(value: string): boolean {
  try {
    assertCanonicalConversationId(value)
    return true
  } catch {
    return false
  }
}

export const controller = createPostUiResponseController()

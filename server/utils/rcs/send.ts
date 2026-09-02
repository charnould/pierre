import { wrap_rcs_message } from './wrap'

const CM_GATEWAY = 'https://gw.messaging.cm.com/v1.0/message'

export class RcsSendError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function send_rcs_message(input: {
  phone: string
  richContent: object
  body?: { content: string }
  reference: string
}): Promise<{ status: number; body: unknown; payload: unknown }> {
  const token = Bun.env['CM_PRODUCT_TOKEN']?.trim() ?? ''
  if (!token) {
    throw new RcsSendError(503, 'not_configured', 'CM_PRODUCT_TOKEN manquant')
  }
  const from = Bun.env['CM_FROM']?.trim() || 'PIERRE'
  const payload = wrap_rcs_message({
    from,
    phone: input.phone,
    richContent: input.richContent,
    body: input.body,
    reference: input.reference
  })

  let response: Response
  try {
    response = await fetch(CM_GATEWAY, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-CM-PRODUCTTOKEN': token
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new RcsSendError(
      502,
      'cm_unavailable',
      error instanceof Error ? error.message : 'CM.com indisponible'
    )
  }

  const text = await response.text()
  let body: unknown = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  if (!response.ok || !cm_body_accepted(body, input.reference)) {
    const status = response.status >= 400 && response.status <= 599 ? response.status : 502
    throw new RcsSendError(status, 'cm_rejected', cm_error_message(body, status))
  }

  return { status: response.status, body, payload }
}

const is_zero_code = (value: unknown): boolean =>
  value === 0 || (typeof value === 'string' && value.trim() === '0')

const cm_body_accepted = (body: unknown, reference: string): boolean => {
  if (body == null || typeof body !== 'object') return false
  const record = body as Record<string, unknown>
  if (!is_zero_code(record['errorCode'])) return false
  const raw_messages = record['messages']
  const messages = Array.isArray(raw_messages)
    ? raw_messages
    : raw_messages &&
        typeof raw_messages === 'object' &&
        Array.isArray((raw_messages as Record<string, unknown>)['msg'])
      ? ((raw_messages as Record<string, unknown>)['msg'] as unknown[])
      : []
  return messages.some((message) => {
    if (message == null || typeof message !== 'object') return false
    const item = message as Record<string, unknown>
    const status = typeof item['status'] === 'string' ? item['status'].toLowerCase() : ''
    return (
      item['reference'] === reference &&
      status === 'accepted' &&
      is_zero_code(item['messageErrorCode']) &&
      (!('errorCode' in item) || is_zero_code(item['errorCode']))
    )
  })
}

function cm_error_message(body: unknown, status: number): string {
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 300)
  if (body != null && typeof body === 'object') {
    const rec = body as { message?: unknown; details?: unknown }
    if (typeof rec.message === 'string' && rec.message.trim()) return rec.message.trim()
    if (typeof rec.details === 'string' && rec.details.trim()) return rec.details.trim()
    try {
      return JSON.stringify(body).slice(0, 300)
    } catch {
      // fall through
    }
  }
  return `CM.com HTTP ${status}`
}

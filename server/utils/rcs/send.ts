const CM_GATEWAY = 'https://gw.messaging.cm.com/v1.0/message'

type RcsSendErrorCode = 'not_configured' | 'cm_unavailable' | 'cm_rejected' | 'cm_invalid_response'

export class RcsSendError extends Error {
  readonly status: number
  readonly code: RcsSendErrorCode
  readonly retryable: boolean

  constructor(status: number, code: RcsSendErrorCode, message: string, retryable: boolean) {
    super(message)
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

export async function send_rcs_message(input: {
  phone: string
  richContent: object
  body?: { content: string }
  reference: string
}): Promise<{ status: number; body: unknown; payload: unknown }> {
  return send_cm_message({
    channels: ['RCS'],
    phone: input.phone,
    body: input.body?.content ?? '',
    richContent: input.richContent,
    reference: input.reference
  })
}

export async function send_sms_message(input: {
  phone: string
  body: string
  reference: string
}): Promise<{ status: number; body: unknown; payload: unknown }> {
  return send_cm_message({
    channels: ['SMS'],
    phone: input.phone,
    body: input.body,
    reference: input.reference
  })
}

async function send_cm_message(input: {
  channels: Array<'RCS' | 'SMS'>
  phone: string
  body: string
  richContent?: object
  reference: string
}): Promise<{ status: number; body: unknown; payload: unknown }> {
  const token = Bun.env['CM_RCS_PRODUCT_TOKEN']?.trim() ?? ''
  if (!token) {
    throw new RcsSendError(503, 'not_configured', 'CM_RCS_PRODUCT_TOKEN manquant', true)
  }
  const from = Bun.env['CM_RCS_FROM']?.trim() || 'PIERRE'
  const payload = {
    messages: {
      msg: [
        {
          from,
          to: [{ number: input.phone }],
          allowedChannels: input.channels,
          body: { type: 'auto', content: input.body },
          ...(input.richContent ? { richContent: input.richContent } : {}),
          reference: input.reference
        }
      ]
    }
  }

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
      error instanceof Error ? error.message : 'CM.com indisponible',
      true
    )
  }

  const text = await response.text()
  let body: unknown = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  if (!response.ok) {
    const status = response.status >= 400 && response.status <= 599 ? response.status : 502
    const retryable =
      response.status === 401 ||
      response.status === 403 ||
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500
    throw new RcsSendError(status, 'cm_rejected', cm_error_message(body, status), retryable)
  }
  const acceptance = cm_acceptance(body, input.reference)
  if (acceptance !== 'accepted') {
    throw new RcsSendError(
      502,
      acceptance === 'rejected' ? 'cm_rejected' : 'cm_invalid_response',
      acceptance === 'rejected' ? cm_error_message(body, 502) : 'Réponse CM.com invalide',
      acceptance === 'invalid'
    )
  }

  return { status: response.status, body, payload }
}

const is_zero_code = (value: unknown): boolean =>
  value === 0 || (typeof value === 'string' && value.trim() === '0')

type CmAcceptance = 'accepted' | 'rejected' | 'invalid'
type CmCode = 'ok' | 'error' | 'invalid'

const cm_code = (value: unknown): CmCode => {
  if (is_zero_code(value)) return 'ok'
  if (typeof value === 'number' && Number.isFinite(value)) return 'error'
  if (typeof value === 'string' && value.trim()) return 'error'
  return 'invalid'
}

const cm_acceptance = (body: unknown, reference: string): CmAcceptance => {
  if (body == null || typeof body !== 'object') return 'invalid'
  const record = body as Record<string, unknown>
  const rootCode = cm_code(record['errorCode'])
  if (rootCode === 'error') return 'rejected'
  if (rootCode === 'invalid') return 'invalid'
  const raw_messages = record['messages']
  const messages = Array.isArray(raw_messages)
    ? raw_messages
    : raw_messages &&
        typeof raw_messages === 'object' &&
        Array.isArray((raw_messages as Record<string, unknown>)['msg'])
      ? ((raw_messages as Record<string, unknown>)['msg'] as unknown[])
      : []
  const message = messages.find(
    (item) =>
      item != null &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item as Record<string, unknown>)['reference'] === reference
  )
  if (!message || Array.isArray(message)) return 'invalid'
  const item = message as Record<string, unknown>
  const status = typeof item['status'] === 'string' ? item['status'].toLowerCase() : ''
  const messageCode = cm_code(item['messageErrorCode'])
  const itemCode = 'errorCode' in item ? cm_code(item['errorCode']) : 'ok'
  if (status === 'rejected' || messageCode === 'error' || itemCode === 'error') return 'rejected'
  return status === 'accepted' && messageCode === 'ok' && itemCode === 'ok' ? 'accepted' : 'invalid'
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

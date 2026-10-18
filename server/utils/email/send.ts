import { emailReady, name, readSetupBytes } from '../setup-store'
import { cm_email, CM_EMAIL_URL } from './cm'
import { EmailSendError } from './errors'

export { EmailSendError }

const escape_html = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '<br>')

const invalid_response = (): EmailSendError =>
  new EmailSendError(502, 'cm_invalid_response', 'Réponse CM.com invalide', true)

export async function send_transactional_email(input: {
  from: string
  to: string
  subject: string
  text: string
  reference?: string
}): Promise<string> {
  const read = cm_email()
  if (!read.ok) throw new EmailSendError(503, 'not_configured', read.message, true)
  const fromDomain = input.from.slice(input.from.lastIndexOf('@') + 1).toLowerCase()
  if (fromDomain !== read.domain) {
    throw new EmailSendError(
      503,
      'not_configured',
      'Le domaine de l’expéditeur ne correspond pas au canal email.',
      true
    )
  }
  if (!emailReady()) {
    throw new EmailSendError(503, 'not_configured', 'Gabarit email incomplet', true)
  }
  const html = new TextDecoder().decode(readSetupBytes('email/html') ?? new Uint8Array())
  const logo = readSetupBytes('email/logo.png')
  if (!logo) throw new EmailSendError(503, 'not_configured', 'Gabarit email incomplet', true)
  let response: Response
  try {
    response = await fetch(CM_EMAIL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cm-producttoken': read.token
      },
      body: JSON.stringify({
        from: { email: input.from, name: name() || input.from },
        to: [{ email: input.to }],
        subject: input.subject,
        text: input.text,
        html: html
          .replaceAll('{{ message }}', escape_html(input.text))
          .replaceAll('{{ logo_inline_cid }}', 'cid:logo.png'),
        attachments: [
          {
            fileName: 'logo.png',
            content: new Uint8Array(logo).toBase64(),
            contentType: 'image/png',
            contentId: 'logo.png'
          }
        ],
        ...(input.reference ? { customerReference: input.reference } : {})
      }),
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new EmailSendError(
      502,
      'cm_unavailable',
      error instanceof Error ? error.message : 'CM.com indisponible',
      true
    )
  }
  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 300)
    const retryable =
      response.status === 401 ||
      response.status === 403 ||
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500
    throw new EmailSendError(
      response.status || 502,
      'cm_rejected',
      detail || `CM.com HTTP ${response.status}`,
      retryable
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw invalid_response()
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw invalid_response()
  }
  const result = payload as Record<string, unknown>
  const messageId = typeof result['messageId'] === 'string' ? result['messageId'].trim() : ''
  if (result['success'] !== true || !messageId) {
    throw invalid_response()
  }
  return messageId
}

import { emailReady, name, readSetupBytes } from '../setup-store'
import { EmailSendError } from './errors'
import { mailgun_api } from './mailgun'

export { EmailSendError }

const escape_html = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '<br>')

const format_mailbox = (display: string, email: string): string => {
  const clean = display
    .replace(/[\r\n<>"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean ? `${clean} <${email}>` : email
}

export async function send_transactional_email(input: {
  from: string
  to: string
  subject: string
  text: string
  reference?: string
}): Promise<void> {
  const read = mailgun_api()
  if (!read.ok) throw new EmailSendError(503, 'not_configured', read.message)
  const fromDomain = input.from.slice(input.from.lastIndexOf('@') + 1).toLowerCase()
  if (fromDomain !== read.api.domain) {
    throw new EmailSendError(503, 'not_configured', 'SINCH_DOMAIN ne correspond pas à email_from')
  }
  if (!emailReady()) throw new EmailSendError(503, 'not_configured', 'Gabarit email incomplet')
  const html = new TextDecoder().decode(readSetupBytes('email/html') ?? new Uint8Array())
  const logo = readSetupBytes('email/logo.png')
  if (!logo) throw new EmailSendError(503, 'not_configured', 'Gabarit email incomplet')
  const form = new FormData()
  form.append('from', format_mailbox(name(), input.from))
  if (input.reference) form.append('h:Message-Id', input.reference)
  form.append('to', input.to)
  form.append('subject', input.subject)
  form.append('text', input.text)
  form.append(
    'html',
    html
      .replaceAll('{{ message }}', escape_html(input.text))
      .replaceAll('{{ logo_inline_cid }}', 'cid:logo.png')
  )
  form.append('o:tracking-opens', 'yes')
  const inline = new Uint8Array(logo.byteLength)
  inline.set(logo)
  form.append('inline', new File([inline], 'logo.png', { type: 'image/png' }))
  const response = await fetch(
    `${read.api.apiBase}/v3/${encodeURIComponent(read.api.domain)}/messages`,
    {
      method: 'POST',
      headers: { authorization: read.api.authorization },
      body: form,
      signal: AbortSignal.timeout(15_000)
    }
  )
  if (response.ok) return
  const detail = (await response.text()).trim().slice(0, 300)
  throw new EmailSendError(
    response.status || 502,
    'mailgun_rejected',
    detail || `Mailgun HTTP ${response.status}`
  )
}

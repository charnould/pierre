import type { AuthContext } from '../../utils/authenticate-user'
import { normalize_email } from '../../utils/contacts'
import { EmailSendError, send_transactional_email } from '../../utils/email/send'
import { parseRepaymentMessage, RepaymentMessageError } from '../../utils/repayment-messages'
import { moduleEmailFrom } from '../../utils/setup-store'

async function rawText(c: AuthContext): Promise<string | Response> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
  }
  const text =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)['text']
      : undefined
  if (typeof text !== 'string') {
    return c.json({ error: { code: 'invalid_body', message: 'texte requis.' } }, 400)
  }
  return text
}

export const verifyRepaymentMessage = async (c: AuthContext) => {
  const text = await rawText(c)
  if (typeof text !== 'string') return text
  try {
    return c.json({ data: parseRepaymentMessage(text) })
  } catch (error) {
    const message = error instanceof RepaymentMessageError ? error.message : 'message invalide.'
    return c.json({ error: { code: 'invalid', message } }, 400)
  }
}

export const testRepaymentEmail = async (c: AuthContext) => {
  const text = await rawText(c)
  if (typeof text !== 'string') return text
  let message
  try {
    message = parseRepaymentMessage(text)
  } catch (error) {
    const detail = error instanceof RepaymentMessageError ? error.message : 'message invalide.'
    return c.json({ error: { code: 'invalid', message: detail } }, 400)
  }
  if (message.kind !== 'email' || message.to !== 'locataire') {
    return c.json({ error: { code: 'invalid', message: 'courriel locataire requis.' } }, 400)
  }
  const user = c.get('user')
  const destinataire = normalize_email(user.email)
  if (destinataire.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Email invalide' } }, 400)
  }
  const from = moduleEmailFrom('repayment')
  if (!from) {
    return c.json(
      { error: { code: 'not_configured', message: 'adresse d’expédition manquante' } },
      503
    )
  }
  try {
    await send_transactional_email({
      from,
      to: destinataire.value,
      subject: message.subject,
      text: message.body
    })
  } catch (error) {
    if (!(error instanceof EmailSendError)) console.error('[post.repayment.email.test]', error)
    const status = error instanceof EmailSendError && error.status === 503 ? 503 : 502
    return c.json(
      {
        error: {
          code: error instanceof EmailSendError ? error.code : 'provider_unavailable',
          message: error instanceof Error ? error.message : 'Échec de l’envoi email'
        }
      },
      status
    )
  }
  return c.json({ data: { sent: true } })
}

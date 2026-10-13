import type { Context } from 'hono'

import type { User } from '../../utils/_schema'
import { normalize_email } from '../../utils/contacts'
import { EmailSendError, send_transactional_email } from '../../utils/email/send'
import { moduleEmailFrom } from '../../utils/setup-store'

export const controller = async (c: Context) => {
  const user = c.get('user') as User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  const destinataire = normalize_email(user.email)
  if (destinataire.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Email invalide' } }, 400)
  }
  const from = moduleEmailFrom('tickets') ?? moduleEmailFrom('repayment')
  if (!from) {
    return c.json({ error: { code: 'not_configured', message: 'email_from manquant' } }, 503)
  }
  try {
    await send_transactional_email({
      from,
      to: destinataire.value,
      subject: 'Email de test',
      text: 'Ceci est un email de test.'
    })
  } catch (error) {
    if (!(error instanceof EmailSendError)) console.error('[post.email.test]', error)
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

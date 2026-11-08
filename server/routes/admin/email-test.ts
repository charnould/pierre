import type { AuthContext } from '../../utils/authenticate-user'
import { normalize_email } from '../../utils/contacts'
import { EmailSendError, send_transactional_email } from '../../utils/email/send'
import { moduleEmailFrom } from '../../utils/setup-store'

export const sendTestEmail = async (c: AuthContext) => {
  const user = c.get('user')
  const destinataire = normalize_email(user.email)
  if (destinataire.status === 'invalid') {
    return c.json({ error: { code: 'invalid_body', message: 'Email invalide' } }, 400)
  }
  const from = moduleEmailFrom('tickets') ?? moduleEmailFrom('repayment')
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

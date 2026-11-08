import type { AuthContext } from '../../utils/authenticate-user'
import { parseRepaymentMessage, RepaymentMessageError } from '../../utils/repayment-messages'

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

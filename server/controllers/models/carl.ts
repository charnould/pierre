import type { Context } from 'hono'

import { modelFilesPresent } from '../../utils/carl'
import { classify } from '../../utils/carl-session'

const MISSING = "Le modèle Carl n'est pas installé."

/**
 * POST /api/models/carl — classifies one tenant message. The text is not stored.
 */
export const controller = async (c: Context) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid', message: 'Corps JSON attendu.' } }, 400)
  }
  const texte =
    body !== null && typeof body === 'object' && 'texte' in body && typeof body.texte === 'string'
      ? body.texte
      : ''
  if (!texte.trim()) {
    return c.json({ error: { code: 'invalid', message: 'Texte vide.' } }, 400)
  }
  if (!modelFilesPresent()) {
    return c.json({ error: { code: 'missing', message: MISSING } }, 503)
  }
  try {
    const started = performance.now()
    const output = await classify(texte)
    return c.json({
      input: texte,
      milliseconds: Math.round(performance.now() - started),
      output
    })
  } catch (cause) {
    console.error('Carl:', cause)
    return c.json({ error: { code: 'failed', message: 'Le classement a échoué.' } }, 500)
  }
}

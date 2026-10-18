import type { Context } from 'hono'

import {
  aiConfigured,
  emailConfigured,
  readProviders,
  rcsConfigured,
  writeProviders,
  type AiType,
  type Providers
} from '../../utils/providers'

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

const invalid = (c: Context, message: string) =>
  c.json({ error: { code: 'invalid', message } }, 400)

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

function secret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytes.toHex()
}

/** Same origin as the session cookie: localhost in development, HOST in production. */
export function publicOrigin(): string {
  if (Bun.env['NODE_ENV'] !== 'production') {
    return `http://localhost:${Bun.env['BUN_PORT'] ?? '3000'}`
  }
  const host = Bun.env['HOST']?.trim() ?? ''
  if (!host) return ''
  return host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`
}

function view(providers: Providers) {
  const origin = publicOrigin().replace(/\/$/, '')
  return {
    ai: {
      configured: aiConfigured(providers),
      type: providers.aiType,
      baseUrl: providers.aiBaseUrl
    },
    rcs: { configured: rcsConfigured(providers), from: providers.rcsFrom },
    email: { configured: emailConfigured(providers), domain: providers.emailDomain },
    webhooks: {
      rcs: origin ? `${origin}/webhook/rcs` : '',
      email: origin ? `${origin}/webhook/email` : ''
    }
  }
}

async function probe(type: AiType, baseUrl: string, apiKey: string): Promise<string | null> {
  const root = baseUrl.replace(/\/+$/, '')
  try {
    const response =
      type === 'anthropic'
        ? await fetch(`${root}/v1/models`, {
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            signal: AbortSignal.timeout(10_000)
          })
        : await fetch(`${root}/models`, {
            headers: { authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10_000)
          })
    if (response.status === 200) return null
    if (response.status === 401 || response.status === 403) return 'La clé a été refusée.'
    return 'Le prestataire est injoignable.'
  } catch {
    return 'Le prestataire est injoignable.'
  }
}

export const getProviders = (c: Context) => c.json({ data: view(readProviders()) })

export const putProviders = async (c: Context) => {
  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return invalid(c, 'JSON requis.')
  }
  const current = readProviders()
  const group = text(body['group'])

  if (group === 'ai') {
    const aiType = text(body['aiType']).toLowerCase()
    const aiBaseUrl = text(body['aiBaseUrl'])
    const aiApiKey = text(body['aiApiKey'])
    if (aiType !== 'openai' && aiType !== 'anthropic') {
      return invalid(c, 'Le prestataire vaut openai ou anthropic.')
    }
    if (!httpsUrl(aiBaseUrl) || !aiApiKey) {
      return invalid(c, 'L’adresse doit être en https et la clé est obligatoire.')
    }
    const refused = await probe(aiType, aiBaseUrl, aiApiKey)
    if (refused) return invalid(c, refused)
    writeProviders({ ...current, aiType, aiBaseUrl, aiApiKey })
    return c.json({ data: {} })
  }

  if (group === 'rcs' && body['regenerateSecret'] === true) {
    if (!rcsConfigured(current)) return invalid(c, 'Le RCS n’est pas encore enregistré.')
    const rcsSecret = secret()
    writeProviders({ ...current, rcsSecret })
    return c.json({ data: { rcsSecret } })
  }

  if (group === 'rcs') {
    const rcsToken = text(body['rcsToken'])
    const rcsFrom = text(body['rcsFrom'])
    if (!rcsToken || !rcsFrom) {
      return invalid(c, 'Le RCS exige le jeton et le nom d’expéditeur.')
    }
    if (!UUID.test(rcsToken)) return invalid(c, 'Le jeton RCS doit être un UUID avec ses tirets.')
    const generated = !current.rcsSecret
    const rcsSecret = current.rcsSecret || secret()
    writeProviders({ ...current, rcsToken, rcsFrom, rcsSecret })
    return c.json({ data: generated ? { rcsSecret } : {} })
  }

  if (group === 'email') {
    const emailDomain = text(body['emailDomain']).toLowerCase()
    const emailToken = text(body['emailToken'])
    const emailAccount = text(body['emailAccount'])
    const emailSecret = text(body['emailSecret'])
    if (!emailDomain || !emailToken || !emailAccount || !emailSecret) {
      return invalid(c, 'L’email exige le domaine, le jeton, l’identifiant et le secret.')
    }
    if (!DOMAIN.test(emailDomain)) return invalid(c, 'Le domaine email est invalide.')
    if (!UUID.test(emailToken))
      return invalid(c, 'Le jeton email doit être un UUID avec ses tirets.')
    if (!UUID.test(emailAccount)) {
      return invalid(c, 'L’identifiant de compte doit être un UUID avec ses tirets.')
    }
    writeProviders({ ...current, emailDomain, emailToken, emailAccount, emailSecret })
    return c.json({ data: {} })
  }

  return invalid(c, 'Groupe inconnu.')
}

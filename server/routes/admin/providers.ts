import { serverBaseUrl } from '../../utils/auth'
import type { AuthContext } from '../../utils/authenticate-user'
import { mailevaToken } from '../../utils/maileva/http'
import { decryptMailevaSecrets, encryptMailevaSecrets } from '../../utils/maileva/secrets'
import { mailevaAccount, unsubmittedMailevaOperations } from '../../utils/maileva/send'
import { decodeBase32 } from '../../utils/maileva/totp'
import {
  emailConfigured,
  llmConfigured,
  type LlmType,
  mailevaLines,
  mailevaTarget,
  parseLlmType,
  type Providers,
  rcsConfigured,
  readProviders,
  writeProviders
} from '../../utils/providers'
import { invalidateAllVms } from '../../utils/vm-registry'

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

const invalid = (c: AuthContext, message: string) =>
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

function view(
  providers: Providers,
  secrets: { clientSecret: string; password: string; totpSecret: string }
) {
  const origin = serverBaseUrl().replace(/\/$/, '')
  const lines = mailevaLines(providers.mailevaAddress)
  const target = mailevaTarget(providers.mailevaUsername)
  return {
    ai: {
      configured: llmConfigured(providers),
      type: providers.llmType,
      baseUrl: providers.llmBaseUrl,
      model: providers.llmModel,
      effort: providers.llmEffort
    },
    rcs: {
      configured: rcsConfigured(providers),
      from: providers.rcsFrom,
      secret: providers.rcsSecret
    },
    email: {
      configured: emailConfigured(providers),
      domain: providers.emailDomain,
      account: providers.emailAccount
    },
    maileva: {
      configured: Boolean(
        providers.mailevaClientId &&
        providers.mailevaUsername &&
        secrets.clientSecret &&
        secrets.password
      ),
      clientId: providers.mailevaClientId,
      username: providers.mailevaUsername,
      senderId: providers.mailevaSenderId,
      address: providers.mailevaAddress,
      target,
      postalReady: Boolean((lines[0] || lines[1]) && lines[5]),
      electronicReady: Boolean(providers.mailevaSenderId && secrets.totpSecret),
      secretsReadable: Boolean(providers.mailevaSecrets && secrets.clientSecret)
    },
    webhooks: {
      rcs: origin ? `${origin}/webhooks/rcs` : '',
      email: origin ? `${origin}/webhooks/email` : ''
    }
  }
}

async function probe(type: LlmType, baseUrl: string, apiKey: string): Promise<string | null> {
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

export const getProviders = async (c: AuthContext) => {
  c.header('Cache-Control', 'no-store')
  const providers = readProviders()
  const secrets = providers.mailevaSecrets
    ? await decryptMailevaSecrets(providers.mailevaSecrets)
    : null
  return c.json({
    data: view(providers, {
      clientSecret: secrets?.clientSecret ?? '',
      password: secrets?.password ?? '',
      totpSecret: secrets?.totpSecret ?? ''
    })
  })
}

export const putProviders = async (c: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return invalid(c, 'JSON requis.')
  }
  const current = readProviders()
  const group = text(body['group'])

  if (group === 'ai') {
    const llmType = parseLlmType(text(body['llmType']))
    if (!llmType) return invalid(c, 'Le type vaut anthropic, openai ou openai-compatible.')
    const llmBaseUrl = text(body['llmBaseUrl'])
    const llmModel = text(body['llmModel'])
    const llmEffort = text(body['llmEffort'])
    const pastedKey = text(body['llmApiKey'])
    const sameEndpoint = current.llmType === llmType && current.llmBaseUrl === llmBaseUrl
    const llmApiKey = pastedKey || (sameEndpoint ? current.llmApiKey : '')
    if (!httpsUrl(llmBaseUrl) || !llmApiKey) {
      return invalid(c, 'L’adresse doit être en https et la clé est obligatoire.')
    }
    if (!llmModel) return invalid(c, 'Le modèle est obligatoire.')
    if (!llmEffort) return invalid(c, 'L’effort est obligatoire.')
    if (pastedKey || !sameEndpoint) {
      const refused = await probe(llmType, llmBaseUrl, llmApiKey)
      if (refused) return invalid(c, refused)
    }
    writeProviders({ ...current, llmType, llmBaseUrl, llmApiKey, llmModel, llmEffort })
    await invalidateAllVms()
    return c.json({ data: {} })
  }

  if (group === 'rcs' && body['regenerateSecret'] === true) {
    if (!rcsConfigured(current)) return invalid(c, 'Le RCS n’est pas encore enregistré.')
    const rcsSecret = secret()
    writeProviders({ ...current, rcsSecret })
    return c.json({ data: { rcsSecret } })
  }

  if (group === 'rcs') {
    const pastedToken = text(body['rcsToken'])
    const rcsFrom = text(body['rcsFrom'])
    const rcsToken = pastedToken || current.rcsToken
    if (!rcsToken || !rcsFrom) {
      return invalid(c, 'Le RCS exige le jeton et le nom d’expéditeur.')
    }
    if (pastedToken && !UUID.test(pastedToken)) {
      return invalid(c, 'Le jeton RCS doit être un UUID avec ses tirets.')
    }
    const pastedSecret = text(body['rcsSecret'])
    if (pastedSecret && !/^[0-9a-f]{64}$/i.test(pastedSecret)) {
      return invalid(c, 'Le secret RCS doit faire 64 caractères hexadécimaux.')
    }
    const generated = !current.rcsSecret && !pastedSecret
    const rcsSecret = pastedSecret || current.rcsSecret || secret()
    writeProviders({ ...current, rcsToken, rcsFrom, rcsSecret })
    return c.json({ data: generated ? { rcsSecret } : {} })
  }

  if (group === 'email') {
    const emailDomain = text(body['emailDomain']).toLowerCase()
    const pastedToken = text(body['emailToken'])
    const emailAccount = text(body['emailAccount'])
    const pastedSecret = text(body['emailSecret'])
    const emailToken = pastedToken || current.emailToken
    const emailSecret = pastedSecret || current.emailSecret
    if (!emailDomain || !emailToken || !emailAccount || !emailSecret) {
      return invalid(c, 'L’email exige le domaine, le jeton, l’identifiant et le secret.')
    }
    if (!DOMAIN.test(emailDomain)) return invalid(c, 'Le domaine email est invalide.')
    if (pastedToken && !UUID.test(pastedToken)) {
      return invalid(c, 'Le jeton email doit être un UUID avec ses tirets.')
    }
    if (!UUID.test(emailAccount)) {
      return invalid(c, 'L’identifiant de compte doit être un UUID avec ses tirets.')
    }
    writeProviders({ ...current, emailDomain, emailToken, emailAccount, emailSecret })
    return c.json({ data: {} })
  }

  if (group === 'maileva') {
    const clientId = text(body['clientId'])
    const username = text(body['username'])
    const senderId = text(body['senderId'])
    const address = text(body['address'])
    const sameAccount = current.mailevaClientId === clientId && current.mailevaUsername === username
    const currentSecrets = current.mailevaSecrets
      ? await decryptMailevaSecrets(current.mailevaSecrets)
      : null
    const clientSecret =
      text(body['clientSecret']) || (sameAccount ? (currentSecrets?.clientSecret ?? '') : '')
    const password = text(body['password']) || (sameAccount ? (currentSecrets?.password ?? '') : '')
    const totpSecret =
      text(body['totpSecret']) || (sameAccount ? (currentSecrets?.totpSecret ?? '') : '')
    const target = mailevaTarget(username)
    if (!clientId || !username || !clientSecret || !password || !target) {
      return invalid(c, 'Maileva exige l’identifiant, l’utilisateur, le secret et le mot de passe.')
    }
    if (
      senderId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(senderId)
    ) {
      return invalid(c, 'L’expéditeur électronique est l’UUID Maileva, pas un nom.')
    }
    if (totpSecret) {
      try {
        decodeBase32(totpSecret)
      } catch {
        return invalid(
          c,
          'La clé TOTP est la clé permanente de 32 caractères, pas un code à 6 chiffres.'
        )
      }
    }
    const lines = mailevaLines(address)
    if (lines.some((line) => line.length > 38)) {
      return invalid(c, 'Chaque ligne d’adresse expéditeur fait 38 caractères maximum.')
    }
    if (lines.some(Boolean) && (!lines[1] || !/^\d{5}\s+\S/.test(lines[5] ?? ''))) {
      return invalid(c, 'L’adresse exige un nom, un code postal et une ville.')
    }
    const nextAccount = mailevaAccount(clientId, username)
    const previousAccount = mailevaAccount(current.mailevaClientId, current.mailevaUsername)
    if (
      current.mailevaClientId &&
      nextAccount !== previousAccount &&
      unsubmittedMailevaOperations() > 0
    ) {
      return invalid(c, 'Un envoi Maileva n’est pas encore soumis.')
    }
    try {
      await mailevaToken({ target, clientId, clientSecret, username, password }, true)
    } catch {
      return invalid(c, 'Maileva a refusé les identifiants.')
    }
    writeProviders({
      ...current,
      mailevaClientId: clientId,
      mailevaUsername: username,
      mailevaSenderId: senderId,
      mailevaAddress: lines.join('\n'),
      mailevaSecrets: await encryptMailevaSecrets({ clientSecret, password, totpSecret })
    })
    c.header('Cache-Control', 'no-store')
    return c.json({ data: {} })
  }

  return invalid(c, 'Groupe inconnu.')
}

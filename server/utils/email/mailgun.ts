const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const encoder = new TextEncoder()
const SKEW_SECONDS = 15 * 60

export type MailgunApi = {
  domain: string
  apiBase: string
  authorization: string
}

export type MailgunFormResult = {
  ok: boolean
  status: number
  json: unknown
  text: string
}

const region_base = (region: string): string | null => {
  if (region === 'eu') return 'https://api.eu.mailgun.net'
  if (region === 'us') return 'https://api.mailgun.net'
  return null
}

/** API d’envoi. Le secret de signature des webhooks est distinct. */
export const mailgun_api = (): { ok: true; api: MailgunApi } | { ok: false; message: string } => {
  const apiKey = Bun.env['MAILGUN_API_KEY']?.trim() ?? ''
  const domain = Bun.env['MAILGUN_DOMAIN']?.trim().toLowerCase() ?? ''
  if (!apiKey) return { ok: false, message: 'MAILGUN_API_KEY manquant' }
  if (!domain) return { ok: false, message: 'MAILGUN_DOMAIN manquant' }
  if (!DOMAIN.test(domain)) return { ok: false, message: 'MAILGUN_DOMAIN invalide' }
  const region = (Bun.env['MAILGUN_REGION']?.trim() || 'eu').toLowerCase()
  const apiBase = region_base(region)
  if (!apiBase) return { ok: false, message: 'MAILGUN_REGION vaut eu ou us' }
  return {
    ok: true,
    api: {
      domain,
      apiBase,
      authorization: `Basic ${btoa(`api:${apiKey}`)}`
    }
  }
}

export const mailgun_signing_key = (): string =>
  Bun.env['MAILGUN_WEBHOOK_SIGNING_KEY']?.trim() ?? ''

export const mailgun_env_started = (): boolean =>
  Boolean(
    Bun.env['MAILGUN_API_KEY']?.trim() ||
    Bun.env['MAILGUN_DOMAIN']?.trim() ||
    Bun.env['MAILGUN_WEBHOOK_SIGNING_KEY']?.trim() ||
    Bun.env['MAILGUN_REGION']?.trim()
  )

/** Origine HTTPS publique, à partir de HOST. */
export const mailgun_callback_origin = (): string | null => {
  const raw = Bun.env['HOST']?.trim() ?? ''
  if (!raw) return null
  const withScheme =
    raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null
  return url.origin
}

const bytes_equal = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left[index]! ^ right[index]!
  return diff === 0
}

/** HMAC-SHA256(timestamp + token), clé = HTTP webhook signing key. */
export async function mailgun_signature_valid(
  timestamp: string,
  token: string,
  signature: string
): Promise<boolean> {
  const key = mailgun_signing_key()
  if (!key || !/^\d{10}$/.test(timestamp) || !token || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SKEW_SECONDS) return false
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(`${timestamp}${token}`))
  )
  return bytes_equal(encoder.encode(digest.toHex()), encoder.encode(signature.toLowerCase()))
}

export async function mailgun_form(
  api: MailgunApi,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  fields?: Record<string, string | string[]>
): Promise<MailgunFormResult> {
  const body = new URLSearchParams()
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      for (const item of Array.isArray(value) ? value : [value]) body.append(key, item)
    }
  }
  const response = await fetch(`${api.apiBase}${path}`, {
    method,
    headers: {
      authorization: api.authorization,
      ...(method === 'GET' ? {} : { 'content-type': 'application/x-www-form-urlencoded' })
    },
    ...(method === 'GET' ? {} : { body }),
    signal: AbortSignal.timeout(15_000)
  })
  const text = (await response.text()).trim()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      json = null
    }
  }
  return { ok: response.ok, status: response.status, json, text }
}

export const mailgun_failure = (action: string, result: MailgunFormResult): Error =>
  new Error(`${action} HTTP ${result.status} ${result.text.slice(0, 300)}`)

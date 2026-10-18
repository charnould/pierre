import { readProviders } from '../providers'

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const SKEW_MS = 5 * 60 * 1000
const encoder = new TextEncoder()

export const CM_EMAIL_URL = 'https://api.cm.com/email/gateway/v1/transactional?priority=low'

export const cm_email = ():
  | { ok: true; token: string; domain: string }
  | { ok: false; message: string } => {
  const providers = readProviders()
  const token = providers.emailToken
  const domain = providers.emailDomain
  if (!token) return { ok: false, message: 'Jeton email manquant' }
  if (!domain) return { ok: false, message: 'Domaine email manquant' }
  if (!DOMAIN.test(domain)) return { ok: false, message: 'Domaine email invalide' }
  return { ok: true, token, domain }
}

const bytes_equal = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left[index]! ^ right[index]!
  return diff === 0
}

/** HMAC-SHA512(svix-id.svix-timestamp.corps), clé UTF-8 brute. */
export async function cm_signature_valid(
  id: string,
  timestamp: string,
  signature: string,
  body: Uint8Array
): Promise<boolean> {
  const secret = readProviders().emailSecret
  if (!secret || !id || !/^\d+$/.test(timestamp) || !signature) return false
  const at = Number(timestamp)
  if (!Number.isSafeInteger(at) || Math.abs(Date.now() - at) > SKEW_MS) return false
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const prefix = encoder.encode(`${id}.${timestamp}.`)
  const data = new Uint8Array(prefix.length + body.length)
  data.set(prefix)
  data.set(body, prefix.length)
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
  return bytes_equal(encoder.encode(digest.toBase64()), encoder.encode(signature))
}

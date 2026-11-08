const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type MailevaSecrets = {
  clientSecret: string
  password: string
  totpSecret: string
}

export const emptyMailevaSecrets = (): MailevaSecrets => ({
  clientSecret: '',
  password: '',
  totpSecret: ''
})

async function key(): Promise<CryptoKey> {
  const secret = Bun.env['AUTH_SECRET']
  if (!secret || secret.length < 32)
    throw new Error('AUTH_SECRET must contain at least 32 characters')
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, [
    'deriveKey'
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('pierre-maileva-v1'),
      info: encoder.encode('maileva-secrets')
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMailevaSecrets(secrets: MailevaSecrets): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(),
    encoder.encode(JSON.stringify(secrets))
  )
  return `v1.${iv.toBase64()}.${new Uint8Array(encrypted).toBase64()}`
}

export async function decryptMailevaSecrets(payload: string): Promise<MailevaSecrets | null> {
  const [version, iv, data] = payload.split('.')
  if (version !== 'v1' || !iv || !data) return null
  try {
    const clear = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Uint8Array.fromBase64(iv) },
      await key(),
      Uint8Array.fromBase64(data)
    )
    const parsed = JSON.parse(decoder.decode(clear)) as Partial<MailevaSecrets>
    return {
      clientSecret: text(parsed.clientSecret),
      password: text(parsed.password),
      totpSecret: text(parsed.totpSecret)
    }
  } catch {
    return null
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

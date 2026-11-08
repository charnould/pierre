const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function decodeBase32(input: string): Uint8Array {
  const clean = input.trim().replace(/=+$/g, '').replace(/ /g, '').toUpperCase()
  if (!clean || [...clean].some((char) => !ALPHABET.includes(char))) {
    throw new Error('Clé TOTP invalide')
  }
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of clean) {
    buffer = (buffer << 5) | ALPHABET.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return Uint8Array.from(bytes)
}

export async function totpCode(secret: string, unixMs: number): Promise<string> {
  const decoded = decodeBase32(secret)
  const raw = new ArrayBuffer(decoded.byteLength)
  new Uint8Array(raw).set(decoded)
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const counter = Math.floor(unixMs / 1000 / 30)
  const message = new DataView(new ArrayBuffer(8))
  message.setUint32(0, Math.floor(counter / 2 ** 32))
  message.setUint32(4, counter >>> 0)
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, message.buffer))
  const offset = (mac[19] ?? 0) & 0x0f
  const binary =
    (((mac[offset] ?? 0) & 0x7f) << 24) |
    ((mac[offset + 1] ?? 0) << 16) |
    ((mac[offset + 2] ?? 0) << 8) |
    (mac[offset + 3] ?? 0)
  return String(binary % 1_000_000).padStart(6, '0')
}

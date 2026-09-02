export type AvatarHex = `#${string}`

const AVATAR_HEX = /^#[0-9a-f]{6}$/

export function parseAvatarHex(value: unknown): AvatarHex | null {
  return typeof value === 'string' && AVATAR_HEX.test(value) ? (value as AvatarHex) : null
}

const AVATAR_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function parseAvatarEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254 || !AVATAR_EMAIL.test(email)) return null
  return email
}

export type AvatarHex = `#${string}`

const AVATAR_HEX = /^#[0-9a-f]{6}$/

export function parseAvatarHex(value: unknown): AvatarHex | null {
  return typeof value === 'string' && AVATAR_HEX.test(value) ? (value as AvatarHex) : null
}

/** Opaque login segment for `/desktop/avatars/:login.webp`. */
const AVATAR_LOGIN = /^[a-z0-9._%+-]+$/i

export function parseAvatarLogin(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const login = raw.trim().toLowerCase()
  if (!login || login.length > 80 || !AVATAR_LOGIN.test(login)) return null
  return login
}

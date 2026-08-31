const AVATAR_INK = '#1A1A1A'

export const AVATAR_TONE_BACKGROUNDS = [
  '#F4C84A',
  '#FF8A5B',
  '#C4B5FD',
  '#7DD3C0',
  '#7EB8DA',
  '#F9A8D4',
  '#A5B4FC'
] as const

export type AvatarTone = { bg: string; fg: typeof AVATAR_INK }

function loginLocalPart(value: string): string {
  const trimmed = value.trim()
  const at = trimmed.indexOf('@')
  return (at === -1 ? trimmed : trimmed.slice(0, at)).trim()
}

export function avatarInitials(login: string): string {
  const local = loginLocalPart(login)
  const parts = local.split(/[._+\s-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  const compact = local.replace(/[^a-zA-Z0-9]/g, '')
  return compact.slice(0, 2).toUpperCase() || '?'
}

export function avatarTone(login: string): AvatarTone {
  const key = loginLocalPart(login).toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0
  const index = Math.abs(hash) % AVATAR_TONE_BACKGROUNDS.length
  return { bg: AVATAR_TONE_BACKGROUNDS[index]!, fg: AVATAR_INK }
}

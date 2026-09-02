/** Stable recipient stored in activity mentions for the desktop agent. */
export const DESKTOP_AGENT_DESTINATAIRE = 'agent:desktop'

/** Derive the selectable @handle from the configured desktop agent name. */
export function desktopAgentMentionHandle(name: unknown): string {
  if (typeof name !== 'string') return 'agent'
  const handle = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
  return handle || 'agent'
}

export function isDesktopAgentIdentity(value: unknown, name: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === DESKTOP_AGENT_DESTINATAIRE || normalized === desktopAgentMentionHandle(name)
}

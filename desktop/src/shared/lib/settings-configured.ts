/** True when stored settings look ready for an auto-login attempt. */
export function isSettingsConfigured(
  settings: {
    url?: unknown
    email?: unknown
    password?: unknown
    hasPassword?: unknown
    loggedOut?: unknown
  } | null
): boolean {
  if (!settings) return false
  const hasSecret =
    (typeof settings.password === 'string' && settings.password.length > 0) ||
    settings.hasPassword === true
  return (
    typeof settings.url === 'string' &&
    settings.url.length > 0 &&
    typeof settings.email === 'string' &&
    settings.email.length > 0 &&
    hasSecret &&
    settings.loggedOut !== true
  )
}

/** Renderer-safe view of settings: never includes the decrypted password. */
export function publicSettings(raw: Record<string, unknown> | null): Record<string, unknown> {
  if (!raw) return {}
  const { password, ...rest } = raw
  return {
    ...rest,
    hasPassword: typeof password === 'string' && password.length > 0
  }
}

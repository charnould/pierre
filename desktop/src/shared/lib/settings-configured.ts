/** True when a server URL is stored and a session restore can be attempted. */
export function isSettingsConfigured(settings: { url?: unknown } | null): boolean {
  return typeof settings?.url === 'string' && settings.url.length > 0
}

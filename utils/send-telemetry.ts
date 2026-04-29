/**
 * Sends a fire-and-forget telemetry ping to Pierre project.
 *
 * Never throws, never blocks the caller.
 *
 * @param event - The event type (e.g. 'ai.chat', 'ai.answer')
 */
export const send_telemetry = (event: string): void => {
  const host = Bun.env['HOST'] ?? 'unknown'
  const TELEMETRY_URL = 'https://assistant.pierre-ia.org/telemetry'

  fetch(TELEMETRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, event, timestamp: new Date().toISOString() }),
    signal: AbortSignal.timeout(5000)
  }).catch(() => {})
}

/**
 * Logs non-fatal main-process errors with a stable scope label.
 *
 * Keeping logs structured helps diagnose production issues without throwing,
 * which is important for long-lived Electron processes.
 */
export function logMainError(scope: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  console.error(`[main:${scope}] ${detail}`)
}

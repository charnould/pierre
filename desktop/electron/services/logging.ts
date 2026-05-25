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

/** Non-fatal diagnostic log for auth and IPC flows (visible in `bun run dev` terminal). */
export function logMainInfo(scope: string, detail: string): void {
  console.log(`[main:${scope}] ${detail}`)
}

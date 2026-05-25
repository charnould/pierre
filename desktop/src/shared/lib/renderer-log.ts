/**
 * Lightweight renderer-side diagnostics without throwing to the UI layer.
 */
export function warnRenderer(scope: string, detail?: unknown): void {
  if (detail === undefined) {
    console.warn(`[renderer:${scope}]`)
    return
  }
  const message = detail instanceof Error ? `${detail.name}: ${detail.message}` : String(detail)
  console.warn(`[renderer:${scope}] ${message}`)
}

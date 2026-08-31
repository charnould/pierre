/** easeOutCubic — used by the non-macOS auth-window bounds tween. */
export function easeOutCubic(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return 1 - (1 - p) ** 3
}

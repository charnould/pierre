/** Shown when a stored phase is no longer in the configuration. Not a configurable phase. */
export const RECLASSIFY_PHASE = 'À reclasser'

export function configuredPhases(phases: readonly string[]): string[] {
  const seen = new Set<string>()
  return phases.flatMap((phase) => {
    const label = phase.trim()
    if (!label || label === RECLASSIFY_PHASE || seen.has(label)) return []
    seen.add(label)
    return [label]
  })
}

export function defaultPhase(phases: readonly string[]): string {
  return configuredPhases(phases)[0] ?? RECLASSIFY_PHASE
}

export function departedPhase(phases: readonly string[]): string {
  return configuredPhases(phases).at(-1) ?? RECLASSIFY_PHASE
}

/**
 * Missing history stays on the first configured phase. A label absent from a
 * configured list is reclassified. Without a configuration, the stored text is kept.
 */
export function resolveRepaymentPhase(
  stored: string | null | undefined,
  phases: readonly string[]
): string {
  const known = configuredPhases(phases)
  const value = typeof stored === 'string' ? stored.trim() : ''
  if (known.length === 0) return value || RECLASSIFY_PHASE
  if (!value) return known[0]!
  return known.includes(value) ? value : RECLASSIFY_PHASE
}

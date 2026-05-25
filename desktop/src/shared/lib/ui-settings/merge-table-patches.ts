import type { TicketsTableSettings } from './schema'

/**
 * Merges debounced partial patches so rapid table edits persist together.
 *
 * Later keys win when both partials define the same property (last write wins).
 */
export function mergeTicketsTablePatches(
  base: Partial<TicketsTableSettings>,
  next: Partial<TicketsTableSettings>
): Partial<TicketsTableSettings> {
  return { ...base, ...next }
}

export type FluidStreamUnit = 'word' | 'char'

export type FluidStreamOptions = {
  unit?: FluidStreamUnit
  /** When true, trailing content without a common prefix is treated as a full replace. */
  allowReset?: boolean
}

/**
 * Returns the suffix of `next` after the longest common prefix with `prev`.
 * Used to animate only newly streamed tokens.
 */
export function computeTextDelta(
  prev: string,
  next: string,
  options: FluidStreamOptions = {}
): string {
  if (next === prev) return ''
  if (!prev) return next
  if (!next) return ''

  if (options.allowReset !== false && !next.startsWith(prev)) {
    return next
  }

  let i = 0
  const max = Math.min(prev.length, next.length)
  while (i < max && prev.charCodeAt(i) === next.charCodeAt(i)) {
    i++
  }
  return next.slice(i)
}

/** Splits a delta into render units (words keep trailing space on the last chunk). */
export function splitStreamUnits(delta: string, unit: FluidStreamUnit): string[] {
  if (!delta) return []
  if (unit === 'char') {
    return [...delta]
  }

  const parts = delta.match(/\S+\s*/g)
  if (!parts) return [delta]
  // Preserve leading whitespace (e.g. delta = " tenant" after "The") by prepending to first word.
  const leading = /^\s+/.exec(delta)?.[0]
  if (leading) parts[0] = leading + parts[0]
  return parts
}

export type QueuedStreamUnit = {
  id: number
  text: string
}

let streamUnitId = 0

export function nextStreamUnitId(): number {
  streamUnitId += 1
  return streamUnitId
}

/** Builds queued units from a text delta for staggered DOM insertion. */
export function buildQueuedUnits(
  prev: string,
  next: string,
  options: FluidStreamOptions = {}
): { units: QueuedStreamUnit[]; snapshot: string } {
  const delta = computeTextDelta(prev, next, options)
  const unit = options.unit ?? 'word'
  const parts = splitStreamUnits(delta, unit)
  const units = parts.map((text) => ({ id: nextStreamUnitId(), text }))
  return { units, snapshot: next }
}

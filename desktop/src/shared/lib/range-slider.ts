/** Bornes inclusives après lecture d'un Slider range (valeurs triées, clampées). */
export function normalizeNumericRange(
  values: readonly number[],
  min: number,
  max: number
): [number, number] {
  const low = values[0] ?? min
  const high = values[1] ?? values[0] ?? max
  const from = Math.max(min, Math.min(low, high))
  const to = Math.min(max, Math.max(low, high))
  return [from, to]
}

/** Libellé compact pour une plage numérique (ex. 2015 – 2020). */
export function formatNumericRangeLabel(from: number, to: number): string {
  if (from === to) return String(from)
  return `${from} – ${to}`
}

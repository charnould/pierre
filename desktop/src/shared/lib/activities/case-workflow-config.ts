export type CaseBucketOption = {
  id: string
  label: string
}

export function normalizeCaseBucketOptions(
  entries: readonly { id: string; label: string }[]
): CaseBucketOption[] {
  return entries.map((entry) => ({
    id: entry.id.trim(),
    label: entry.label.trim()
  }))
}

export function normalizeCaseTagOptions(entries: readonly string[]): string[] {
  const seen = new Set<string>()
  return entries.flatMap((entry) => {
    const label = entry.trim()
    if (!label || seen.has(label)) return []
    seen.add(label)
    return [label]
  })
}

export function canonicalizeCaseTags(
  selected: readonly string[],
  options: readonly string[]
): string[] {
  const selectedSet = new Set(selected.map((label) => label.trim()).filter(Boolean))
  return options.filter((label) => selectedSet.has(label))
}

export function sameCaseTagSet(
  left: readonly string[],
  right: readonly string[],
  options: readonly string[]
): boolean {
  const a = canonicalizeCaseTags(left, options)
  const b = canonicalizeCaseTags(right, options)
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

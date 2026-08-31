export function sortSelectOptions(options: readonly string[]): string[] {
  return [...options].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

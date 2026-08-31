export type SlashFieldTrigger = {
  start: number
  query: string
}

export type SlashFieldItem = {
  value: string
  label: string
}

export function getSlashFieldTrigger(value: string, caret: number): SlashFieldTrigger | null {
  const before = value.slice(0, caret)
  const match = /(^|\s)\/([A-Za-z0-9_]*)$/.exec(before)
  if (!match) return null
  const query = match[2] ?? ''
  return { start: caret - query.length - 1, query }
}

export function insertSlashField(
  value: string,
  trigger: SlashFieldTrigger,
  field: string,
  caret: number
): { value: string; caret: number } {
  const before = value.slice(0, trigger.start)
  const after = value.slice(caret)
  const token = `{{${field}}}`
  const separator = after.startsWith(' ') || after.startsWith('\n') ? '' : ' '
  return {
    value: `${before}${token}${separator}${after}`,
    caret: before.length + token.length + separator.length
  }
}

export function filterSlashFields(fields: SlashFieldItem[], query: string): SlashFieldItem[] {
  const normalized = query.toLocaleLowerCase('fr')
  return fields
    .filter(
      (field) =>
        field.value.toLocaleLowerCase('fr').includes(normalized) ||
        field.label.toLocaleLowerCase('fr').includes(normalized)
    )
    .slice(0, 20)
}

export function bindMatchingPlaceholders(
  placeholders: string[],
  bindings: Record<string, string>,
  fields: Array<{ value: string }>
): Record<string, string> {
  const available = new Set(fields.map((field) => field.value))
  return Object.fromEntries(
    placeholders.map((placeholder) => [
      placeholder,
      bindings[placeholder] || (available.has(placeholder) ? placeholder : '')
    ])
  )
}

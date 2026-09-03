import type {
  BulkDelivery,
  PlaceholderBindings,
  SimpleDeliveryStep
} from '../../../shared/bulk-operations'

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g

export const collect_placeholders = (input: unknown, acc = new Set<string>()): Set<string> => {
  if (typeof input === 'string') {
    for (const match of input.matchAll(PLACEHOLDER_RE)) {
      const key = match[1]
      if (key) acc.add(key)
    }
    return acc
  }
  if (Array.isArray(input)) {
    for (const item of input) collect_placeholders(item, acc)
    return acc
  }
  if (input && typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) {
      collect_placeholders(value, acc)
    }
  }
  return acc
}

export const apply_placeholders = (input: unknown, values: Record<string, string>): unknown => {
  if (typeof input === 'string') {
    return input.replace(PLACEHOLDER_RE, (_, key: string) => values[key] ?? `{{${key}}}`)
  }
  if (Array.isArray(input)) return input.map((item) => apply_placeholders(item, values))
  if (input && typeof input === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      next[key] = apply_placeholders(value, values)
    }
    return next
  }
  return input
}

export const unresolved_placeholders = (rendered: unknown): string[] => [
  ...collect_placeholders(rendered)
]

export const stringify_placeholder_value = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'oui' : 'non'
  return String(value).trim()
}

export class BulkPlaceholderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BulkPlaceholderError'
  }
}

export const step_placeholders = (step: SimpleDeliveryStep): Set<string> => {
  if ('placeholders' in step) {
    return new Set(step.placeholders)
  }
  return collect_placeholders(
    step.medium === 'email' || step.medium === 'lre' ? [step.subject, step.body] : step.body
  )
}

export const delivery_placeholders = (delivery: BulkDelivery): Set<string> => {
  const placeholders = new Set<string>()
  if (delivery.kind === 'fallback') {
    for (const step of delivery.steps) {
      for (const key of step_placeholders(step)) placeholders.add(key)
    }
  } else {
    for (const node of delivery.nodes) {
      collect_placeholders([node.body, node.richContent], placeholders)
    }
  }
  return placeholders
}

const today = (now: Date): string => {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}`
}

export const validate_bindings = (
  placeholders: Iterable<string>,
  bindings: PlaceholderBindings,
  columns: ReadonlySet<string>
): void => {
  const expected = [...new Set(placeholders)].sort()
  const actual = Object.keys(bindings).sort()
  const missing = expected.filter((key) => !(key in bindings))
  const obsolete = actual.filter((key) => !expected.includes(key))
  if (missing.length || obsolete.length) {
    throw new BulkPlaceholderError(
      [
        missing.length ? `Bindings manquants : ${missing.join(', ')}` : '',
        obsolete.length ? `Bindings obsolètes : ${obsolete.join(', ')}` : ''
      ]
        .filter(Boolean)
        .join('; ')
    )
  }
  for (const [key, column] of Object.entries(bindings)) {
    if (column !== 'date_du_jour' && !columns.has(column)) {
      throw new BulkPlaceholderError(`Colonne inconnue pour {{${key}}} : ${column}`)
    }
  }
}

export const render_content = (
  content: unknown,
  bindings: PlaceholderBindings,
  rowValues: Record<string, unknown>,
  now: Date
): unknown => {
  const placeholders = collect_placeholders(content)
  validate_bindings(placeholders, bindings, new Set(Object.keys(rowValues)))
  return apply_placeholders(content, resolve_binding_values(bindings, rowValues, now))
}

export const resolve_binding_values = (
  bindings: PlaceholderBindings,
  rowValues: Record<string, unknown>,
  now: Date
): Record<string, string> => {
  const values: Record<string, string> = {}
  for (const [key, column] of Object.entries(bindings)) {
    values[key] =
      column === 'date_du_jour' ? today(now) : stringify_placeholder_value(rowValues[column])
  }
  return values
}

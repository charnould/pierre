export const HIERARCHY_SUFFIX = '_hierarchie'
export const HIERARCHY_SEPARATOR = ' > '

export const HIERARCHY_CONVENTION = {
  applies_to_suffix: HIERARCHY_SUFFIX,
  separator: HIERARCHY_SEPARATOR,
  order: 'general_to_specific',
  depth: 'variable',
  missing_levels: 'omitted',
  exact_segment_filter_sql: "instr(' > ' || {column} || ' > ', ' > ' || :segment || ' > ') > 0"
} as const

export class HierarchyValueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HierarchyValueError'
  }
}

export const isHierarchyColumn = (name: string): boolean => name.endsWith(HIERARCHY_SUFFIX)

const normalizeSegment = (segment: string): string => {
  const normalized = segment
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/gu, '_')
    .replace(/_+/g, '_')
  if (normalized === '') throw new HierarchyValueError('Segment hiérarchique vide')
  return normalized
}

const segments = (value: string): string[] => {
  if (!value.includes('>')) return [value]
  const parts = value.split(HIERARCHY_SEPARATOR)
  if (parts.length === 1 || parts.some((part) => part.trim() === '' || part.includes('>'))) {
    throw new HierarchyValueError('Séparateur hiérarchique invalide')
  }
  return parts
}

/** Canonical Pierre value: lowercase unaccented segments, exact ` > ` separator. */
export const normalizeHierarchyValue = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value !== 'string') throw new HierarchyValueError('Une hiérarchie doit être un texte')
  const trimmed = value.normalize('NFC').trim()
  if (trimmed === '') return null
  return segments(trimmed).map(normalizeSegment).join(HIERARCHY_SEPARATOR)
}

/** Last known segment, or `null` when the value is empty or malformed. */
export const hierarchyLeaf = (value: unknown): string | null => {
  try {
    const normalized = normalizeHierarchyValue(value)
    if (!normalized) return null
    const index = normalized.lastIndexOf(HIERARCHY_SEPARATOR)
    return index === -1 ? normalized : normalized.slice(index + HIERARCHY_SEPARATOR.length)
  } catch {
    return null
  }
}

/** Safe SQLite predicate for one exact segment. `{column}` must be a bare identifier. */
export const hierarchySegmentSql = (column: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) {
    throw new HierarchyValueError(`Colonne hiérarchique invalide : ${column}`)
  }
  return HIERARCHY_CONVENTION.exact_segment_filter_sql
    .replaceAll('{column}', `"${column}"`)
    .replaceAll(':segment', '?')
}

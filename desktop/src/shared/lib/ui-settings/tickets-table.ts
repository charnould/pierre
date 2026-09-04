export const RECLAMATIONS_PAGE_SIZE = 150

/** Must match `MAX_COLUMN_FILTER_DISTINCT_VALUES` in `utils/tickets-query.ts`. */

export const facetFilterUnavailableMessage = (totalDistinct: number): string =>
  `Cette colonne compte ${totalDistinct} valeurs distinctes. Saisissez une recherche pour filtrer.`

/** Locked first column containing only the unread notification signal. */
export const TICKET_TABLE_ALERT_COLUMN_ID = '__alertes__'

export const TICKET_TABLE_ALERT_COLUMN_WIDTH = 40

const TICKET_TABLE_SYSTEM_COLUMN_IDS = new Set<string>([TICKET_TABLE_ALERT_COLUMN_ID])

export const isTicketTableSystemColumn = (columnId: string): boolean =>
  TICKET_TABLE_SYSTEM_COLUMN_IDS.has(columnId)

export const stripTicketTableSystemColumns = (columnIds: string[]): string[] =>
  columnIds.filter((id) => !isTicketTableSystemColumn(id))

export const stripTicketTableSystemColumnWidths = (
  widths: Record<string, number>
): Record<string, number> => {
  const next = { ...widths }
  delete next[TICKET_TABLE_ALERT_COLUMN_ID]
  return next
}

export const ticketTableSystemColumnSizing = (): Record<string, number> => ({
  [TICKET_TABLE_ALERT_COLUMN_ID]: TICKET_TABLE_ALERT_COLUMN_WIDTH
})
const COLUMN_WIDTH_MIN = 60
const COLUMN_WIDTH_MAX = 800

const CORE_TICKET_COLUMN_ORDER = ['id_reclamation', 'id_locataire', 'id_lot'] as const

export type ColumnFilters = Record<string, string[]>

export const parseColumnOrder = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const order = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
  return order.length > 0 ? order : undefined
}

export const parseHiddenColumns = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const hidden = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
  return hidden.length > 0 ? hidden : undefined
}

export const DEFAULT_PINNED_COLUMNS = [...CORE_TICKET_COLUMN_ORDER]

export const parsePinnedColumns = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const pinned = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
  return pinned.length > 0 ? pinned : undefined
}

const parseColumnWidth = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < COLUMN_WIDTH_MIN || n > COLUMN_WIDTH_MAX) return undefined
  return n
}

export const parseColumnWidths = (value: unknown): Record<string, number> | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const widths: Record<string, number> = {}
  for (const [key, rawWidth] of Object.entries(value)) {
    const width = parseColumnWidth(rawWidth)
    if (width !== undefined) widths[key] = width
  }
  return Object.keys(widths).length > 0 ? widths : undefined
}

export const resolveColumnWidth = (saved: number | undefined, fallback: number): number => {
  if (saved !== undefined) return saved
  return fallback
}

export const parseColumnFilters = (value: unknown): ColumnFilters | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const filters: ColumnFilters = {}
  for (const [key, rawValues] of Object.entries(value)) {
    if (!Array.isArray(rawValues)) continue
    const values = rawValues.filter((v): v is string => typeof v === 'string')
    if (values.length > 0) filters[key] = values
  }
  return Object.keys(filters).length > 0 ? filters : undefined
}

export const resolveColumnOrder = (schemaColumnNames: string[], userOrder?: string[]): string[] => {
  if (!userOrder?.length) {
    const core = CORE_TICKET_COLUMN_ORDER.filter((name) => schemaColumnNames.includes(name))
    const rest = schemaColumnNames.filter(
      (name) =>
        !CORE_TICKET_COLUMN_ORDER.includes(name as (typeof CORE_TICKET_COLUMN_ORDER)[number])
    )
    return [...core, ...rest]
  }

  const schemaSet = new Set(schemaColumnNames)
  const ordered = userOrder.filter((name) => schemaSet.has(name))
  const rest = schemaColumnNames.filter((name) => !ordered.includes(name))
  return [...ordered, ...rest]
}

export const resolveVisibleColumnNames = (
  schemaColumnNames: string[],
  options?: { columnOrder?: string[]; hiddenColumns?: string[] }
): string[] => {
  const ordered = resolveColumnOrder(schemaColumnNames, options?.columnOrder)
  const hidden = new Set(options?.hiddenColumns ?? [])
  return ordered.filter((name) => !hidden.has(name))
}

export type ColumnVisibilityState = Record<string, boolean>

export const hiddenColumnsToColumnVisibility = (
  schemaColumnNames: string[],
  hiddenColumns: string[]
): ColumnVisibilityState => {
  const hidden = new Set(hiddenColumns)
  const visibility: ColumnVisibilityState = {}
  for (const name of schemaColumnNames) {
    visibility[name] = !hidden.has(name)
  }
  return visibility
}

export const columnVisibilityToHiddenColumns = (
  schemaColumnNames: string[],
  visibility: ColumnVisibilityState
): string[] => schemaColumnNames.filter((name) => visibility[name] === false)

export const resolveUnpinnedColumnOrder = (fullOrder: string[], pinnedLeft: string[]): string[] => {
  const pinnedSet = new Set(pinnedLeft)
  return fullOrder.filter((name) => !pinnedSet.has(name))
}

export const mergeFullColumnOrder = (pinnedLeft: string[], unpinnedOrder: string[]): string[] => [
  ...pinnedLeft,
  ...unpinnedOrder
]

export const resolvePinnedColumns = (
  visibleColumnNames: string[],
  userPinned?: string[] | null
): string[] => {
  const pinnedSet = new Set(userPinned === undefined ? DEFAULT_PINNED_COLUMNS : userPinned)
  return visibleColumnNames.filter((name) => pinnedSet.has(name))
}

export const filtersToQueryParams = (
  filters: ColumnFilters | undefined
): Record<string, string[]> => {
  if (!filters) return {}
  const params: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) params[key] = values
  }
  return params
}

export const sanitizeColumnFilters = (
  filters: ColumnFilters | undefined,
  schemaColumnNames: string[]
): ColumnFilters => {
  if (!filters) return {}
  const allowed = new Set(schemaColumnNames)
  const cleaned: ColumnFilters = {}
  for (const [key, values] of Object.entries(filters)) {
    if (!allowed.has(key)) continue
    if (values.length > 0) cleaned[key] = values
  }
  return cleaned
}

export const areColumnFiltersEqual = (a: ColumnFilters, b: ColumnFilters): boolean => {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const av = a[key]
    const bv = b[key]
    if (!bv || av.length !== bv.length) return false
    for (let i = 0; i < av.length; i += 1) {
      if (av[i] !== bv[i]) return false
    }
  }
  return true
}

export const hasActiveColumnFilters = (filters: ColumnFilters | undefined): boolean =>
  Object.values(filters ?? {}).some((values) => values.length > 0)

export const clearAllColumnFilters = (): ColumnFilters => ({})

export const formatFacetLabel = (value: string): string => (value === '' ? '(vide)' : value)

export type ColumnValueBadgeDefaults = {
  fontWeight?: number
  textColor?: string
}

export type ColumnValueStyle = {
  bgColor: string
  textColor: string
}

export type ColumnValuesConfig = Record<string, Record<string, ColumnValueStyle>>

export type TicketValueBadgeStyle = {
  background: string
  color: string
  border: string
  fontWeight: number
}

export type TicketValueDisplay = {
  text: string
  badgeStyle?: TicketValueBadgeStyle
}

const DEFAULT_COLUMN_VALUE_BADGE: Required<ColumnValueBadgeDefaults> = {
  fontWeight: 500,
  textColor: '#FFFFFF'
}

export const parseBadgeFontWeight = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 100 && value <= 900) {
    return Math.round(value / 100) * 100
  }
  return undefined
}

export const parseColumnValueBadgeDefaults = (
  value: unknown
): ColumnValueBadgeDefaults | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const fontWeight = parseBadgeFontWeight(raw.fontWeight)
  const textColor = parseHexColor(raw.textColor)
  if (!fontWeight && !textColor) return undefined
  return {
    ...(fontWeight ? { fontWeight } : {}),
    ...(textColor ? { textColor } : {})
  }
}

export const resolveColumnValueBadgeDefaults = (
  defaults?: ColumnValueBadgeDefaults
): Required<ColumnValueBadgeDefaults> => ({
  fontWeight: defaults?.fontWeight ?? DEFAULT_COLUMN_VALUE_BADGE.fontWeight,
  textColor: defaults?.textColor ?? DEFAULT_COLUMN_VALUE_BADGE.textColor
})

export const colorizeBadgeBorder = (background: string, color: string): string =>
  `color-mix(in oklch, ${background} 72%, ${color})`

export const columnValueStyleToBadge = (
  style: ColumnValueStyle,
  defaults: Required<ColumnValueBadgeDefaults>
): TicketValueBadgeStyle => ({
  background: style.bgColor,
  color: style.textColor,
  border: colorizeBadgeBorder(style.bgColor, style.textColor),
  fontWeight: defaults.fontWeight
})

export const colorizeBadgeStyle = (badge: TicketValueBadgeStyle) => ({
  backgroundColor: badge.background,
  color: badge.color,
  fontWeight: badge.fontWeight,
  borderColor: badge.border
})

const formatBadgeText = (text: string): string => {
  if (text === '—') return text
  const normalized = text.normalize('NFC').trim().toLocaleLowerCase('fr-FR')
  return normalized.charAt(0).toLocaleUpperCase('fr-FR') + normalized.slice(1)
}

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

export const parseHexColor = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return HEX_COLOR.test(trimmed) ? trimmed : undefined
}

/** Normalizes lookup keys so NFC/NFD accents match between API values and JSON config. */
export const normalizeColumnValueKey = (value: string): string => value.trim().normalize('NFC')

const parseColumnValueStyle = (value: unknown): ColumnValueStyle | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const bgColor = parseHexColor(raw.bgColor)
  const textColor = parseHexColor(raw.textColor)
  if (!bgColor || !textColor) return undefined
  return { bgColor, textColor }
}

/** Case-insensitive lookup for column and value keys in columnValues config. */
export const findColumnValueStyle = (
  columnValues: ColumnValuesConfig | undefined,
  column: string,
  valueKey: string
): ColumnValueStyle | undefined => {
  if (!columnValues) return undefined

  const columnKey = normalizeColumnValueKey(column)
  let columnMap = columnValues[column]
  if (!columnMap) {
    for (const [name, styles] of Object.entries(columnValues)) {
      if (normalizeColumnValueKey(name).toLowerCase() === columnKey.toLowerCase()) {
        columnMap = styles
        break
      }
    }
  }
  if (!columnMap) return undefined

  const normalizedValueKey = normalizeColumnValueKey(valueKey)
  if (columnMap[normalizedValueKey]) return columnMap[normalizedValueKey]
  if (columnMap[valueKey]) return columnMap[valueKey]

  const valueLower = normalizedValueKey.toLowerCase()
  for (const [key, style] of Object.entries(columnMap)) {
    if (normalizeColumnValueKey(key).toLowerCase() === valueLower) return style
  }
  return undefined
}

export const parseColumnValues = (value: unknown): ColumnValuesConfig | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const config: ColumnValuesConfig = {}
  for (const [column, rawValues] of Object.entries(value)) {
    if (typeof rawValues !== 'object' || rawValues === null || Array.isArray(rawValues)) continue
    const values: Record<string, ColumnValueStyle> = {}
    for (const [rawKey, rawStyle] of Object.entries(rawValues)) {
      const style = parseColumnValueStyle(rawStyle)
      if (style) values[normalizeColumnValueKey(rawKey)] = style
    }
    if (Object.keys(values).length > 0) config[normalizeColumnValueKey(column)] = values
  }
  return Object.keys(config).length > 0 ? config : undefined
}

/** Maps a SQLite cell value to the `columnValues` JSON lookup key. */
const columnValueLookupKey = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return normalizeColumnValueKey(String(value))
}

const cellDisplayText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export const resolveTicketValueDisplay = (
  column: string,
  value: unknown,
  columnValues?: ColumnValuesConfig,
  badgeDefaults?: ColumnValueBadgeDefaults
): TicketValueDisplay => {
  const rawText = cellDisplayText(value)
  if (rawText === '—') return { text: rawText }

  const style = findColumnValueStyle(columnValues, column, columnValueLookupKey(value))
  if (!style) return { text: rawText }

  const resolvedDefaults = resolveColumnValueBadgeDefaults(badgeDefaults)

  return {
    text: formatBadgeText(rawText),
    badgeStyle: columnValueStyleToBadge(style, resolvedDefaults)
  }
}

import {
  normalizeColumnValueKey,
  parseHexColor,
  type ColumnValueStyle,
  type ColumnValuesConfig
} from './tickets-table'

export const COLUMN_VALUE_VARIANTS_PER_FAMILY = 18
export const COLUMN_VALUE_FAMILY_COUNT = 10
export const COLUMN_VALUE_PALETTE_SIZE =
  COLUMN_VALUE_VARIANTS_PER_FAMILY * COLUMN_VALUE_FAMILY_COUNT

export type ColumnValueColorFamily = {
  id: string
  variants: ColumnValueStyle[]
}

const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (channel: number): string =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

const buildFamilyVariants = (hue: number, options?: { neutral?: boolean }): ColumnValueStyle[] => {
  const variants: ColumnValueStyle[] = []
  for (let i = 0; i < COLUMN_VALUE_VARIANTS_PER_FAMILY; i++) {
    if (options?.neutral) {
      variants.push({
        bgColor: hslToHex(0, 0, 90 - (i % 6)),
        textColor: hslToHex(0, 0, 24 + (i % 8))
      })
    } else {
      variants.push({
        bgColor: hslToHex(hue, 38 + (i % 6) * 3, 84 + (i % 4)),
        textColor: hslToHex(hue, 46 + (i % 5) * 2, 24 + (i % 7))
      })
    }
  }
  return variants
}

/** Pastel color families for auto-colorize (red, blue, green, …). */
export const buildColumnValueColorGroups = (): ColumnValueColorFamily[] => [
  { id: 'red', variants: buildFamilyVariants(0) },
  { id: 'orange', variants: buildFamilyVariants(28) },
  { id: 'amber', variants: buildFamilyVariants(45) },
  { id: 'green', variants: buildFamilyVariants(130) },
  { id: 'turquoise', variants: buildFamilyVariants(170) },
  { id: 'blue', variants: buildFamilyVariants(210) },
  { id: 'indigo', variants: buildFamilyVariants(240) },
  { id: 'violet', variants: buildFamilyVariants(275) },
  { id: 'pink', variants: buildFamilyVariants(330) },
  { id: 'neutral', variants: buildFamilyVariants(0, { neutral: true }) }
]

export const COLUMN_VALUE_COLOR_GROUPS = buildColumnValueColorGroups()

export const COLUMN_VALUE_COLOR_PALETTE = COLUMN_VALUE_COLOR_GROUPS.flatMap(
  (group) => group.variants
)

export const shuffleWithRandom = <T>(items: readonly T[], random: () => number): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

export class ColumnValuePaletteExhaustedError extends Error {
  constructor(distinctCount: number, paletteSize: number) {
    super(`Cannot assign ${distinctCount} unique color pairs from a palette of ${paletteSize}`)
    this.name = 'ColumnValuePaletteExhaustedError'
  }
}

export const pairKey = (style: ColumnValueStyle): string => `${style.bgColor}|${style.textColor}`

const assignColumnValueStylesRoundRobin = (
  keys: string[],
  groups: readonly ColumnValueColorFamily[],
  random: () => number
): Record<string, ColumnValueStyle> => {
  if (keys.length > COLUMN_VALUE_PALETTE_SIZE) {
    throw new ColumnValuePaletteExhaustedError(keys.length, COLUMN_VALUE_PALETTE_SIZE)
  }

  const preparedGroups = shuffleWithRandom(groups, random).map((group) => ({
    id: group.id,
    variants: shuffleWithRandom(group.variants, random)
  }))
  const cursors = preparedGroups.map(() => 0)
  const usedPairs = new Set<string>()
  const styles: Record<string, ColumnValueStyle> = {}

  for (let i = 0; i < keys.length; i++) {
    let assigned = false
    for (let offset = 0; offset < preparedGroups.length; offset++) {
      const gIdx = (i + offset) % preparedGroups.length
      const group = preparedGroups[gIdx]!
      let vIdx = cursors[gIdx]!
      while (vIdx < group.variants.length) {
        const pair = group.variants[vIdx]!
        vIdx++
        cursors[gIdx] = vIdx
        const key = pairKey(pair)
        if (usedPairs.has(key)) continue
        usedPairs.add(key)
        styles[keys[i]!] = pair
        assigned = true
        break
      }
      if (assigned) break
    }
    if (!assigned) {
      throw new ColumnValuePaletteExhaustedError(keys.length, COLUMN_VALUE_PALETTE_SIZE)
    }
  }

  return styles
}

export const familyIdForStyle = (
  groups: readonly ColumnValueColorFamily[],
  style: ColumnValueStyle
): string | undefined => {
  const key = pairKey(style)
  for (const group of groups) {
    if (group.variants.some((variant) => pairKey(variant) === key)) return group.id
  }
  return undefined
}

export const generateColumnValueStyles = (
  values: string[],
  options?: {
    random?: () => number
    groups?: readonly ColumnValueColorFamily[]
  }
): Record<string, ColumnValueStyle> => {
  const groups = options?.groups ?? COLUMN_VALUE_COLOR_GROUPS
  const random = options?.random ?? Math.random

  const keys: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (value === '') continue
    const key = normalizeColumnValueKey(value)
    const dedupeKey = key.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    keys.push(key)
  }

  return assignColumnValueStylesRoundRobin(keys, groups, random)
}

export const findColumnValueStylesMap = (
  columnValues: ColumnValuesConfig | undefined,
  column: string
): Record<string, ColumnValueStyle> | undefined => {
  if (!columnValues) return undefined

  const columnKey = normalizeColumnValueKey(column)
  if (columnValues[column]) return columnValues[column]

  for (const [name, styles] of Object.entries(columnValues)) {
    if (normalizeColumnValueKey(name).toLowerCase() === columnKey.toLowerCase()) {
      return styles
    }
  }
  return undefined
}

export const hasColumnValueStyles = (
  columnValues: ColumnValuesConfig | undefined,
  column: string
): boolean => {
  const styles = findColumnValueStylesMap(columnValues, column)
  return styles !== undefined && Object.keys(styles).length > 0
}

export const columnColorizeButtonLabel = (hasExistingStyles: boolean): string =>
  hasExistingStyles ? 'Recoloriser' : 'Coloriser les colonnes'

export const columnDecolorizeButtonLabel = (): string => 'Décoloriser'

/** Retire les styles d’une colonne (insensible à la casse du nom de colonne). */
export function clearColumnValueStyles(
  columnValues: ColumnValuesConfig | undefined,
  column: string
): ColumnValuesConfig {
  if (!columnValues) return {}
  const columnKey = normalizeColumnValueKey(column).toLowerCase()
  const next: ColumnValuesConfig = {}
  for (const [name, styles] of Object.entries(columnValues)) {
    if (normalizeColumnValueKey(name).toLowerCase() === columnKey) continue
    next[name] = styles
  }
  return next
}

export const isValidColumnValuePalette = (palette: readonly ColumnValueStyle[]): boolean => {
  if (palette.length !== COLUMN_VALUE_PALETTE_SIZE) return false
  const seen = new Set<string>()
  for (const pair of palette) {
    if (!parseHexColor(pair.bgColor) || !parseHexColor(pair.textColor)) return false
    const key = pairKey(pair)
    if (seen.has(key)) return false
    seen.add(key)
  }
  return true
}

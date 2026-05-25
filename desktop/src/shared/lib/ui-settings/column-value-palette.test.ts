import { describe, expect, it } from 'bun:test'

import {
  buildColumnValueColorGroups,
  COLUMN_VALUE_COLOR_GROUPS,
  COLUMN_VALUE_COLOR_PALETTE,
  COLUMN_VALUE_FAMILY_COUNT,
  COLUMN_VALUE_PALETTE_SIZE,
  COLUMN_VALUE_VARIANTS_PER_FAMILY,
  columnColorizeButtonLabel,
  ColumnValuePaletteExhaustedError,
  familyIdForStyle,
  findColumnValueStylesMap,
  generateColumnValueStyles,
  hasColumnValueStyles,
  isValidColumnValuePalette,
  pairKey,
  shuffleWithRandom
} from './column-value-palette'
import { parseHexColor } from './tickets-table'

const createSeededRandom =
  (seed: number): (() => number) =>
  () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

describe('column-value-palette', () => {
  it('buildColumnValueColorGroups has 10 families with 18 variants each', () => {
    const groups = buildColumnValueColorGroups()
    expect(groups).toHaveLength(COLUMN_VALUE_FAMILY_COUNT)
    for (const group of groups) {
      expect(group.variants).toHaveLength(COLUMN_VALUE_VARIANTS_PER_FAMILY)
    }
    expect(COLUMN_VALUE_PALETTE_SIZE).toBe(180)
  })

  it('COLUMN_VALUE_COLOR_PALETTE is valid and all hex colors parse', () => {
    expect(isValidColumnValuePalette(COLUMN_VALUE_COLOR_PALETTE)).toBe(true)
    for (const pair of COLUMN_VALUE_COLOR_PALETTE) {
      expect(parseHexColor(pair.bgColor)).toBeDefined()
      expect(parseHexColor(pair.textColor)).toBeDefined()
    }
  })

  it('shuffleWithRandom is deterministic with a seeded random', () => {
    const source = ['a', 'b', 'c', 'd', 'e']
    const first = shuffleWithRandom(source, createSeededRandom(42))
    const second = shuffleWithRandom(source, createSeededRandom(42))
    expect(first).toEqual(second)
    expect(first).not.toEqual(source)
  })

  it('generateColumnValueStyles assigns one unique pair per distinct value', () => {
    const values = ['urgent', 'normal', 'faible', 'urgent']
    const styles = generateColumnValueStyles(values, { random: createSeededRandom(7) })
    expect(Object.keys(styles)).toEqual(['urgent', 'normal', 'faible'])

    const usedPairs = new Set(Object.values(styles).map(pairKey))
    expect(usedPairs.size).toBe(3)
  })

  it('generateColumnValueStyles ignores empty facet values', () => {
    const styles = generateColumnValueStyles(['', 'ouvert'], { random: createSeededRandom(1) })
    expect(Object.keys(styles)).toEqual(['ouvert'])
  })

  it('generateColumnValueStyles dedupes values that normalize to the same key', () => {
    const styles = generateColumnValueStyles(['En cours', 'en cours'], {
      random: createSeededRandom(3)
    })
    expect(Object.keys(styles)).toEqual(['En cours'])
  })

  it('generateColumnValueStyles never reuses the same pair within one assignment', () => {
    const values = Array.from({ length: 25 }, (_, i) => `value-${i}`)
    const styles = generateColumnValueStyles(values, { random: createSeededRandom(123) })
    const pairs = Object.values(styles).map(pairKey)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('generateColumnValueStyles uses many color families for 20 values', () => {
    const values = Array.from({ length: 20 }, (_, i) => `value-${i}`)
    const styles = generateColumnValueStyles(values, { random: createSeededRandom(5) })
    const families = new Set(
      Object.values(styles).map((style) => familyIdForStyle(COLUMN_VALUE_COLOR_GROUPS, style))
    )
    expect(families.size).toBeGreaterThanOrEqual(10)
  })

  it('generateColumnValueStyles throws when distinct values exceed palette size', () => {
    const values = Array.from({ length: 5 }, (_, i) => `v${i}`)
    const tinyGroups = [
      {
        id: 'tiny',
        variants: [
          { bgColor: '#AABBCC', textColor: '#112233' },
          { bgColor: '#CCBBAA', textColor: '#332211' },
          { bgColor: '#BBAACC', textColor: '#221133' },
          { bgColor: '#AACCBB', textColor: '#113322' }
        ]
      }
    ]
    expect(() =>
      generateColumnValueStyles(values, { groups: tinyGroups, random: createSeededRandom(1) })
    ).toThrow(ColumnValuePaletteExhaustedError)
  })

  it('generateColumnValueStyles produces different assignments with different seeds', () => {
    const values = ['a', 'b', 'c', 'd']
    const first = generateColumnValueStyles(values, { random: createSeededRandom(10) })
    const second = generateColumnValueStyles(values, { random: createSeededRandom(99) })
    expect(first).not.toEqual(second)
  })

  it('hasColumnValueStyles detects existing column styles case-insensitively', () => {
    const columnValues = {
      Avancement: {
        'en cours': { bgColor: '#B5C2F4', textColor: '#2A40A0' }
      }
    }
    expect(hasColumnValueStyles(columnValues, 'avancement')).toBe(true)
    expect(hasColumnValueStyles(columnValues, 'statut')).toBe(false)
    expect(hasColumnValueStyles(undefined, 'avancement')).toBe(false)
  })

  it('findColumnValueStylesMap returns styles for matching column name', () => {
    const columnValues = {
      statut: {
        ouvert: { bgColor: '#B5C2F4', textColor: '#2A40A0' }
      }
    }
    expect(findColumnValueStylesMap(columnValues, 'STATUT')).toEqual(columnValues.statut)
  })

  it('columnColorizeButtonLabel switches after first colorization', () => {
    expect(columnColorizeButtonLabel(false)).toBe('Coloriser les colonnes')
    expect(columnColorizeButtonLabel(true)).toBe('Recoloriser')
  })
})

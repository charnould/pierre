import { describe, expect, it } from 'bun:test'

import {
  buildTicketFiltersWhere,
  parseTicketFilterRules,
  partitionFilterRules,
  suggestCompareForColumn
} from '../../../utils/ticket-filters'

const COLUMN_NAMES = [
  'id_reclamation',
  'id_locataire',
  'id_lot',
  'type_affaire',
  'avancement',
  'date_creation'
]

describe('partitionFilterRules', () => {
  it('separates valid and orphaned rules', () => {
    const rules = [
      { kind: 'values' as const, column: 'type_affaire', values: ['Technique'] },
      {
        kind: 'compare' as const,
        column: 'removed_col',
        operator: 'gt' as const,
        value: '2026-01-01'
      },
      { kind: 'values' as const, column: 'avancement', values: [] }
    ]
    const { valid, orphaned } = partitionFilterRules(rules, COLUMN_NAMES)
    expect(valid).toHaveLength(1)
    expect(valid[0]?.column).toBe('type_affaire')
    expect(orphaned).toHaveLength(1)
    expect(orphaned[0]?.column).toBe('removed_col')
  })
})

describe('buildTicketFiltersWhere', () => {
  it('builds equality and IN conditions', () => {
    const { where, params } = buildTicketFiltersWhere(
      [{ kind: 'values', column: 'motif', values: ['fuite', 'chauffage'] }],
      ['motif']
    )
    expect(where).toBe('WHERE "motif" IN (?, ?)')
    expect(params).toEqual(['fuite', 'chauffage'])
  })

  it('builds compare conditions', () => {
    const { where, params } = buildTicketFiltersWhere(
      [{ kind: 'compare', column: 'date_creation', operator: 'gt', value: '2026-01-01' }],
      COLUMN_NAMES
    )
    expect(where).toBe('WHERE "date_creation" > ?')
    expect(params).toEqual(['2026-01-01'])
  })

  it('combines multiple rules with AND', () => {
    const { where, params } = buildTicketFiltersWhere(
      [
        { kind: 'values', column: 'type_affaire', values: ['Technique'] },
        { kind: 'compare', column: 'date_creation', operator: 'gte', value: '2026-01-01' }
      ],
      COLUMN_NAMES
    )
    expect(where).toBe('WHERE "type_affaire" = ? AND "date_creation" >= ?')
    expect(params).toEqual(['Technique', '2026-01-01'])
  })

  it('ignores orphaned rules', () => {
    const { where, params } = buildTicketFiltersWhere(
      [
        { kind: 'values', column: 'type_affaire', values: ['Technique'] },
        { kind: 'values', column: 'old_column', values: ['x'] }
      ],
      COLUMN_NAMES
    )
    expect(where).toBe('WHERE "type_affaire" = ?')
    expect(params).toEqual(['Technique'])
  })
})

describe('suggestCompareForColumn', () => {
  it('suggests compare for date_* columns', () => {
    expect(suggestCompareForColumn({ name: 'date_creation', type: 'TEXT' })).toBe(true)
    expect(suggestCompareForColumn({ name: 'motif', type: 'TEXT' })).toBe(false)
  })
})

describe('parseTicketFilterRules', () => {
  it('parses valid JSON rules', () => {
    const rules = parseTicketFilterRules([
      { kind: 'values', column: 'type_affaire', values: ['Technique'] },
      { kind: 'compare', column: 'date_creation', operator: 'gt', value: '2026-01-01' },
      { kind: 'values', column: 'bad', values: [] },
      { bad: true }
    ])
    expect(rules).toHaveLength(2)
  })
})

import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import {
  HIERARCHY_CONVENTION,
  hierarchyLeaf,
  hierarchySegmentSql,
  HierarchyValueError,
  isHierarchyColumn,
  normalizeHierarchyValue
} from './hierarchy'

describe('normalizeHierarchyValue', () => {
  it('canonicalizes case and spacing without erasing meaning', () => {
    expect(normalizeHierarchyValue('R+1')).toBe('r+1')
    expect(normalizeHierarchyValue('R-1')).toBe('r-1')
    expect(normalizeHierarchyValue('A/B')).toBe('a/b')
    expect(normalizeHierarchyValue('A-B')).toBe('a-b')
    expect(normalizeHierarchyValue('Côté')).toBe('cote')
    expect(normalizeHierarchyValue('Cote')).toBe('cote')
    expect(normalizeHierarchyValue('Œuvre')).toBe('oeuvre')
    expect(
      normalizeHierarchyValue('Direction Relation Client > Service Proximité > Agence 5 - Mansart')
    ).toBe('direction_relation_client > service_proximite > agence_5_-_mansart')
    expect(normalizeHierarchyValue('  Service   Proximité  ')).toBe('service_proximite')
  })

  it('keeps variable depth and omitted levels', () => {
    expect(normalizeHierarchyValue('technique')).toBe('technique')
    expect(normalizeHierarchyValue('Technique > Fuite de lavabo')).toBe(
      'technique > fuite_de_lavabo'
    )
    expect(normalizeHierarchyValue(null)).toBeNull()
    expect(normalizeHierarchyValue('   ')).toBeNull()
  })

  it('is idempotent', () => {
    const canonical = 'direction_relation_client > service_proximite > agence_5_-_mansart'
    expect(normalizeHierarchyValue(canonical)).toBe(canonical)
  })

  it('rejects an ambiguous separator', () => {
    for (const value of ['a>b', 'a >b', 'a> b', '> a', 'a >', 'a > > b', 'a >  > b']) {
      expect(() => normalizeHierarchyValue(value)).toThrow(HierarchyValueError)
    }
  })

  it('rejects a non-text value', () => {
    expect(() => normalizeHierarchyValue(12)).toThrow(HierarchyValueError)
  })
})

describe('hierarchy readers', () => {
  it('reads the most specific segment', () => {
    expect(hierarchyLeaf('technique > plomberie > fuite_de_lavabo')).toBe('fuite_de_lavabo')
    expect(hierarchyLeaf('technique')).toBe('technique')
    expect(hierarchyLeaf(null)).toBeNull()
    expect(hierarchyLeaf('a>b')).toBeNull()
  })

  it('recognizes hierarchy columns only by their suffix', () => {
    expect(isHierarchyColumn('qualification_hierarchie')).toBe(true)
    expect(isHierarchyColumn('hierarchie')).toBe(false)
    expect(isHierarchyColumn('qualification_1')).toBe(false)
  })
})

describe('hierarchy SQL', () => {
  it('matches one exact segment at any depth', () => {
    const db = new Database(':memory:')
    db.run('CREATE TABLE sample (qualification_hierarchie TEXT)')
    const insert = db.prepare('INSERT INTO sample (qualification_hierarchie) VALUES (?)')
    for (const value of [
      'a > b > c',
      'b > c',
      'a > b',
      'b',
      'bb',
      'a > bb > c',
      'plomberie_generale',
      null
    ]) {
      insert.run(value)
    }

    const matches = (segment: string) =>
      db
        .query<{ n: number }, [string]>(
          `SELECT COUNT(*) AS n FROM sample WHERE ${hierarchySegmentSql('qualification_hierarchie')}`
        )
        .get(segment)!.n

    expect(matches('b')).toBe(4)
    expect(matches('a')).toBe(3)
    expect(matches('c')).toBe(3)
    expect(matches('bb')).toBe(2)
    expect(matches('plomberie')).toBe(0)
    expect(HIERARCHY_CONVENTION.exact_segment_filter_sql).toContain(':segment')
    db.close()
  })
})

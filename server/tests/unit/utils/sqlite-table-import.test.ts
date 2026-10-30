import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import { HierarchyValueError } from '../../../../shared/hierarchy'
import { import_rows } from '../../../utils/knowledge/sqlite-table-import'

const hierarchy = async (value: unknown) => {
  const db = new Database(':memory:')
  await import_rows(db, 'patrimoine', [{ id: '1', qualification_hierarchie: value }])
  const row = db
    .query<{ qualification_hierarchie: string | null }, []>(
      'SELECT qualification_hierarchie FROM patrimoine'
    )
    .get()
  db.close()
  return row?.qualification_hierarchie
}

describe('hierarchy import normalization', () => {
  test('canonicalizes every hierarchy column before storage', async () => {
    expect(
      await hierarchy('Direction Relation Client > Service Proximité > Agence 5 - Mansart')
    ).toBe('direction_relation_client > service_proximite > agence_5_-_mansart')
    expect(await hierarchy('R+1')).toBe('r+1')
    expect(await hierarchy('R-1')).toBe('r-1')
    expect(await hierarchy('A/B')).toBe('a/b')
    expect(await hierarchy('A-B')).toBe('a-b')
    expect(await hierarchy('Côté')).toBe('cote')
    expect(await hierarchy('Cote')).toBe('cote')
    expect(await hierarchy('Œuvre')).toBe('oeuvre')
    expect(await hierarchy('Technique')).toBe('technique')
    expect(await hierarchy(null)).toBeNull()
    expect(await hierarchy('   ')).toBeNull()
  })

  test('rejects a malformed hierarchy', async () => {
    await expect(hierarchy('a > > b')).rejects.toBeInstanceOf(HierarchyValueError)
    await expect(hierarchy('a>b')).rejects.toBeInstanceOf(HierarchyValueError)
  })
})

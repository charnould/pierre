import { describe, expect, it } from 'bun:test'

import {
  isKnowledgeSourceAssigned,
  normalize_knowledge_name,
  validateSpreadsheetHeaders
} from './knowledge'

describe('isKnowledgeSourceAssigned', () => {
  it('is assigned when a profile or a module is selected', () => {
    expect(isKnowledgeSourceAssigned({ profileIds: [], moduleIds: [] })).toBe(false)
    expect(isKnowledgeSourceAssigned({ profileIds: ['default'], moduleIds: [] })).toBe(true)
    expect(isKnowledgeSourceAssigned({ profileIds: [], moduleIds: ['tickets'] })).toBe(true)
  })
})

describe('validateSpreadsheetHeaders', () => {
  it('ignores completely empty columns and horizontal-merge spacer columns', () => {
    const result = validateSpreadsheetHeaders(
      [
        { value: 'Désignation', own: true },
        { value: 'Désignation', own: false },
        { value: 'Quantité', own: true },
        { value: null, own: false }
      ],
      [
        { colIndex: 0, colLetter: 'A', lastNonEmptyRow: 10, lastOwnRow: 10 },
        { colIndex: 1, colLetter: 'B', lastNonEmptyRow: 10, lastOwnRow: 2 },
        { colIndex: 2, colLetter: 'C', lastNonEmptyRow: 10, lastOwnRow: 10 },
        { colIndex: 3, colLetter: 'D', lastNonEmptyRow: 0, lastOwnRow: 0 }
      ],
      3
    )
    expect(result).toEqual({
      ok: true,
      columns: [
        { colIndex: 0, colLetter: 'A', name: 'designation' },
        { colIndex: 2, colLetter: 'C', name: 'quantite' }
      ]
    })
  })

  it('rejects untitled columns with data and duplicate normalized headers with column letters', () => {
    const untitled = validateSpreadsheetHeaders(
      [
        { value: null, own: false },
        { value: 'Adresse', own: true }
      ],
      [
        { colIndex: 0, colLetter: 'A', lastNonEmptyRow: 5, lastOwnRow: 5 },
        { colIndex: 1, colLetter: 'B', lastNonEmptyRow: 5, lastOwnRow: 5 }
      ],
      2
    )
    expect(untitled).toEqual({
      ok: false,
      code: 'invalid_spreadsheet_header',
      message: 'Colonne sans titre : A.'
    })

    const duplicate = validateSpreadsheetHeaders(
      [
        { value: 'Niveau', own: true },
        { value: 'niveau', own: true }
      ],
      [
        { colIndex: 0, colLetter: 'O', lastNonEmptyRow: 5, lastOwnRow: 5 },
        { colIndex: 1, colLetter: 'P', lastNonEmptyRow: 5, lastOwnRow: 5 }
      ],
      1
    )
    expect(duplicate).toMatchObject({
      ok: false,
      code: 'duplicate_spreadsheet_header',
      message: 'Colonnes en doublon : O et P (« niveau »).'
    })
  })
})

describe('normalize_knowledge_name', () => {
  describe('basic normalization', () => {
    it('converts to lowercase', () => {
      expect(normalize_knowledge_name('Hello')).toBe('hello')
    })

    it('removes common accents', () => {
      expect(normalize_knowledge_name('résumé')).toBe('resume')
      expect(normalize_knowledge_name('àéîõü')).toBe('aeiou')
    })

    it('replaces spaces and special chars with underscores', () => {
      expect(normalize_knowledge_name('hello world')).toBe('hello_world')
      expect(normalize_knowledge_name('foo-bar+baz')).toBe('foo_bar_baz')
    })

    it('collapses consecutive special chars into a single underscore', () => {
      expect(normalize_knowledge_name('foo   bar')).toBe('foo_bar')
    })

    it('trims leading and trailing underscores', () => {
      expect(normalize_knowledge_name('_leading')).toBe('leading')
      expect(normalize_knowledge_name('trailing_')).toBe('trailing')
    })
  })

  describe('ligature and special letter handling', () => {
    it('replaces all occurrences of œ (not just the first one)', () => {
      expect(normalize_knowledge_name('cœur_sœur')).toBe('coeur_soeur')
    })

    it('replaces uppercase Œ ligatures after lowercasing', () => {
      expect(normalize_knowledge_name("Résumé de l'Œuvre")).toBe('resume_de_l_oeuvre')
    })

    it('replaces ç via NFD decomposition', () => {
      expect(normalize_knowledge_name('garçon')).toBe('garcon')
    })
  })
})

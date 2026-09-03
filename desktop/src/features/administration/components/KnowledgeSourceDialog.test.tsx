import { describe, expect, test } from 'bun:test'

import { normalize_knowledge_name } from '../../../../../shared/knowledge'
import {
  encyclopediaTitleForSave,
  officialEncyclopediaTitle,
  replaceKnowledgeEntry
} from './KnowledgeSourceDialog'

describe('KnowledgeSourceDialog', () => {
  test('updates only the targeted workbook entry', () => {
    const first = {
      title: 'Premier',
      sheet: 0,
      sheetName: 'Premier',
      headerRow: 0,
      profileIds: [],
      moduleIds: []
    }
    const second = { ...first, title: 'Second', sheet: 1, sheetName: 'Second' }
    const replacement = { ...second, title: 'Second configuré', profileIds: ['default'] }

    expect(replaceKnowledgeEntry([first, second], 1, replacement)).toEqual([first, replacement])
  })

  test('normalizes an encyclopedia title to an LLM-readable snake_case table name', () => {
    expect(normalize_knowledge_name('Suivi des indicateurs')).toBe('suivi_des_indicateurs')
    expect(normalize_knowledge_name('Indicateurs 2024')).toBe('indicateurs_2024')
    expect(normalize_knowledge_name("Résumé de l'Œuvre")).toBe('resume_de_l_oeuvre')
  })

  test('restores the official file or sheet title when the override is cleared', () => {
    const csv = { fileType: 'csv' as const, originalName: 'Indicateurs 2024.csv' }
    const sheet = { sheetName: 'Données' }
    expect(officialEncyclopediaTitle(csv, { sheetName: null })).toBe('Indicateurs 2024')
    expect(
      officialEncyclopediaTitle({ fileType: 'xlsx', originalName: 'Classeur.xlsx' }, sheet)
    ).toBe('Données')
    expect(encyclopediaTitleForSave('  Suivi  ', csv, { sheetName: null })).toBe('Suivi')
    expect(encyclopediaTitleForSave('   ', csv, { sheetName: null })).toBe('Indicateurs 2024')
    expect(
      encyclopediaTitleForSave('', { fileType: 'xlsx', originalName: 'Classeur.xlsx' }, sheet)
    ).toBe('Données')
  })
})

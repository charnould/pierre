import { describe, expect, test } from 'bun:test'

import { normalize_knowledge_name } from '@pierre/shared/knowledge'

import { encyclopediaTitleForSave, officialEncyclopediaTitle } from './KnowledgeSourceDialog'

describe('KnowledgeSourceDialog', () => {
  test('normalizes an encyclopedia title to an LLM-readable snake_case table name', () => {
    expect(normalize_knowledge_name('Suivi des indicateurs')).toBe('suivi_des_indicateurs')
    expect(normalize_knowledge_name('Indicateurs 2024')).toBe('indicateurs_2024')
    expect(normalize_knowledge_name("Résumé de l'Œuvre")).toBe('resume_de_l_oeuvre')
  })

  test('restores the official file or sheet title when the override is cleared', () => {
    const csv = { fileType: 'csv' as const, originalName: 'Indicateurs 2024.csv', sheetName: null }
    const sheet = { fileType: 'xlsx' as const, originalName: 'Classeur.xlsx', sheetName: 'Données' }
    expect(officialEncyclopediaTitle(csv)).toBe('Indicateurs 2024')
    expect(officialEncyclopediaTitle(sheet)).toBe('Données')
    expect(encyclopediaTitleForSave('  Suivi  ', csv)).toBe('Suivi')
    expect(encyclopediaTitleForSave('   ', csv)).toBe('Indicateurs 2024')
    expect(encyclopediaTitleForSave('', sheet)).toBe('Données')
  })
})

import { describe, expect, it } from 'bun:test'

import { normalize_knowledge_name } from '../../../utils/knowledge/utils'

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

  describe('extension handling', () => {
    it('normalizes extensions by default', () => {
      expect(normalize_knowledge_name('Mon Fichier.json')).toBe('mon_fichier_json')
      expect(normalize_knowledge_name('Data.XLSX')).toBe('data_xlsx')
    })

    it('preserves the file extension when requested', () => {
      expect(normalize_knowledge_name('Mon Fichier.json', { preserve_extension: true })).toBe(
        'mon_fichier.json'
      )
      expect(normalize_knowledge_name('Data.XLSX', { preserve_extension: true })).toBe('data.XLSX')
    })

    it('handles values without extension', () => {
      expect(normalize_knowledge_name('mon fichier', { preserve_extension: true })).toBe(
        'mon_fichier'
      )
    })

    it('uses the last dot as extension separator when preserving extension', () => {
      expect(normalize_knowledge_name('foo.bar.baz.md', { preserve_extension: true })).toBe(
        'foo_bar_baz.md'
      )
    })

    it('treats a leading dot as part of the name, even when preserving extension', () => {
      expect(normalize_knowledge_name('.hidden', { preserve_extension: true })).toBe('hidden')
    })
  })
})

import { describe, expect, it } from 'bun:test'

import {
  ABOUT_SKILL_KEYS,
  ABOUT_SUBJECT_TO_SKILL,
  KNOWLEDGE_SKILL,
  REQUEST_SKILL_KEYS
} from '../../../desktop/src/lib/knowledge-skills'

describe('knowledge-skills', () => {
  it('expose les ids customization pour les skills request', () => {
    for (const key of REQUEST_SKILL_KEYS) {
      expect(KNOWLEDGE_SKILL[key]).toMatch(/^request\./)
    }
  })

  it('expose les ids customization pour les skills about', () => {
    for (const key of ABOUT_SKILL_KEYS) {
      expect(KNOWLEDGE_SKILL[key]).toMatch(/^about\./)
    }
  })

  it('mappe locataire vers about.tenant', () => {
    expect(KNOWLEDGE_SKILL[ABOUT_SUBJECT_TO_SKILL.locataire]).toBe('about.tenant')
    expect(KNOWLEDGE_SKILL[ABOUT_SUBJECT_TO_SKILL.lot]).toBe('about.unit')
    expect(KNOWLEDGE_SKILL[ABOUT_SUBJECT_TO_SKILL.programme]).toBe('about.building')
  })
})

import { describe, expect, test } from 'bun:test'

import { ABOUT_SUBJECTS } from '@/features/tickets/lib/knowledge-skills'

import { ABOUT_SUBJECT_ENTITY, aboutIdSkill } from './about-form'

describe('ABOUT_SUBJECT_ENTITY coverage', () => {
  test('defines entity field copy for every about subject', () => {
    for (const subject of ABOUT_SUBJECTS) {
      const entity = ABOUT_SUBJECT_ENTITY[subject]
      expect(entity.label.length).toBeGreaterThan(0)
      expect(entity.placeholder.length).toBeGreaterThan(0)
    }
  })
})

describe('aboutIdSkill alignment', () => {
  test('returns about.* skill for each subject', () => {
    for (const subject of ABOUT_SUBJECTS) {
      expect(aboutIdSkill(subject)).toMatch(/^about\./)
    }
  })
})

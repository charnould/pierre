import { describe, expect, test } from 'bun:test'

import { KNOWLEDGE_SKILL } from './knowledge-skills'

describe('KNOWLEDGE_SKILL ids', () => {
  test('uses the about prompt', () => {
    expect(KNOWLEDGE_SKILL.aboutSummary).toBe('about')
  })
})

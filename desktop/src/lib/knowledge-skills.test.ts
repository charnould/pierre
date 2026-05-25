import { describe, expect, test } from 'bun:test'

import { requestSkillKeyActions } from './knowledge-skills'

describe('requestSkillKeyActions', () => {
  test('maps hotkeys to skill setters', () => {
    let skill: string | undefined
    const actions = requestSkillKeyActions((s) => {
      skill = s
    })
    actions.a()
    expect(skill).toBe('requestReplyEmail')
    actions.d()
    expect(skill).toBe('requestRewrite')
  })
})

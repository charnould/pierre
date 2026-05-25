import { describe, expect, test } from 'bun:test'

import { reasoningUiForSkill } from './useSkillConfigs'

describe('reasoningUiForSkill', () => {
  test('hides reasoning when skill is unknown', () => {
    expect(reasoningUiForSkill({}, 'missing')).toEqual({
      display: 'off',
      showReasoningTokens: false,
      reasoningCollapsible: 'full'
    })
  })

  test('enables partial collapsible mode', () => {
    expect(
      reasoningUiForSkill(
        {
          'request.reply-email': {
            id: 'request.reply-email',
            display: 'x',
            reasoning_display: 'partial'
          }
        },
        'request.reply-email'
      )
    ).toEqual({
      display: 'partial',
      showReasoningTokens: true,
      reasoningCollapsible: 'partial'
    })
  })
})

import { describe, expect, test } from 'bun:test'

import { captureReasoningForSkill, reasoningUiForSkill } from './useSkillConfigs'

describe('reasoningUiForSkill', () => {
  test('hides reasoning when skill is unknown', () => {
    expect(reasoningUiForSkill({}, 'missing')).toEqual({
      display: 'none',
      showReasoningTokens: false,
      reasoningCollapsible: 'full'
    })
  })

  test('captureReasoningForSkill falls back for ticket and about skills before API load', () => {
    expect(captureReasoningForSkill({}, 'ticket.answer-ticket')).toBe(true)
    expect(captureReasoningForSkill({}, 'about.summary')).toBe(true)
  })

  test('captureReasoningForSkill respects loaded none config', () => {
    expect(
      captureReasoningForSkill(
        {
          'ticket.answer-ticket': {
            id: 'ticket.answer-ticket',
            display: 'x',
            trace: 'none'
          }
        },
        'ticket.answer-ticket'
      )
    ).toBe(false)
  })

  test('enables collapsed collapsible mode', () => {
    expect(
      reasoningUiForSkill(
        {
          'ticket.answer-ticket': {
            id: 'ticket.answer-ticket',
            display: 'x',
            trace: 'collapsed'
          }
        },
        'ticket.answer-ticket'
      )
    ).toEqual({
      display: 'collapsed',
      showReasoningTokens: true,
      reasoningCollapsible: 'partial'
    })
  })
})

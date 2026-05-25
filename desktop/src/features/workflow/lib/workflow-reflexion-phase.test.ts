import { describe, expect, test } from 'bun:test'

import { shouldShowReflexion } from './workflow-reflexion-phase'

describe('shouldShowReflexion', () => {
  test('shows during reasoning before analysis latch', () => {
    expect(
      shouldShowReflexion({
        showReasoningTokens: true,
        isReasoningPhase: true,
        analysisStarted: false
      })
    ).toBe(true)
  })

  test('hides when analysis started', () => {
    expect(
      shouldShowReflexion({
        showReasoningTokens: true,
        isReasoningPhase: true,
        analysisStarted: true
      })
    ).toBe(false)
  })

  test('hides when reasoning tokens disabled', () => {
    expect(
      shouldShowReflexion({
        showReasoningTokens: false,
        isReasoningPhase: true,
        analysisStarted: false
      })
    ).toBe(false)
  })
})

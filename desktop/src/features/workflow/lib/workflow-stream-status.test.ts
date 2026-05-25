import { describe, expect, test } from 'bun:test'

import { workflowStreamStatusLabel } from './workflow-stream-status'

describe('workflowStreamStatusLabel', () => {
  test('returns Réflexion during reasoning phase with tokens', () => {
    expect(workflowStreamStatusLabel({ showReasoningTokens: true, isReasoningPhase: true })).toBe(
      'Réflexion'
    )
  })

  test('returns Génération during response phase', () => {
    expect(workflowStreamStatusLabel({ showReasoningTokens: true, isReasoningPhase: false })).toBe(
      'Génération'
    )
  })

  test('returns Génération when reasoning tokens disabled', () => {
    expect(workflowStreamStatusLabel({ showReasoningTokens: false, isReasoningPhase: true })).toBe(
      'Génération'
    )
  })
})

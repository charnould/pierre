import { describe, expect, it } from 'bun:test'

import { buildWorkflowTelemetryEvent, CHAT_TELEMETRY_EVENT } from '../../../utils/telemetry-event'

describe('telemetry-event', () => {
  it('CHAT_TELEMETRY_EVENT is ai.chat', () => {
    expect(CHAT_TELEMETRY_EVENT).toBe('ai.chat')
  })

  it('buildWorkflowTelemetryEvent prefixes id_skill with ai.answer.', () => {
    expect(buildWorkflowTelemetryEvent('ticket.answer-ticket')).toBe(
      'ai.answer.ticket.answer-ticket'
    )
    expect(buildWorkflowTelemetryEvent('about.summary')).toBe('ai.answer.about.summary')
    expect(buildWorkflowTelemetryEvent('repayment.create-plan')).toBe(
      'ai.answer.repayment.create-plan'
    )
  })

  it('buildWorkflowTelemetryEvent rejects empty skillId', () => {
    expect(() => buildWorkflowTelemetryEvent('')).toThrow('skillId required')
    expect(() => buildWorkflowTelemetryEvent('   ')).toThrow('skillId required')
  })
})

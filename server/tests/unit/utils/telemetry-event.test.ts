import { describe, expect, it } from 'bun:test'

import { buildWorkflowTelemetryEvent, CHAT_TELEMETRY_EVENT } from '../../../utils/telemetry-event'

describe('telemetry-event', () => {
  it('CHAT_TELEMETRY_EVENT is ai.chat', () => {
    expect(CHAT_TELEMETRY_EVENT).toBe('ai.chat')
  })

  it('buildWorkflowTelemetryEvent prefixes id_skill with ai.answer.', () => {
    expect(buildWorkflowTelemetryEvent('about')).toBe('ai.answer.about')
    expect(buildWorkflowTelemetryEvent('replies')).toBe('ai.answer.replies')
  })

  it('buildWorkflowTelemetryEvent rejects empty skillId', () => {
    expect(() => buildWorkflowTelemetryEvent('')).toThrow('skillId required')
    expect(() => buildWorkflowTelemetryEvent('   ')).toThrow('skillId required')
  })
})

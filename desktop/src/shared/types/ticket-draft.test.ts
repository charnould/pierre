import { describe, expect, it } from 'bun:test'

import { draftDisplayOutput, draftIsAutomationGenerated, type TicketDraft } from './ticket-draft'

const baseDraft = (): TicketDraft => ({
  id_reclamation: 'REQ-1',
  id_skill: 'ticket.answer-ticket',
  channel: null,
  generated_output: 'gen-o',
  generated_reasoning: 'gen-r',
  generated_duration_ms: 100,
  generated_at: '2026-01-01T00:00:00.000Z',
  generated_by: 'gen@x.com',
  automation_id: null,
  edited_output: null,
  edited_at: null,
  edited_by: null,
  feedback_rating: null,
  feedback_comment: null,
  feedback_at: null,
  feedback_by: null
})

describe('ticket-draft display helpers', () => {
  it('draftDisplayOutput prefers edited over generated', () => {
    const d = baseDraft()
    expect(draftDisplayOutput(d)).toBe('gen-o')
    expect(draftDisplayOutput({ ...d, edited_output: 'edit-o' })).toBe('edit-o')
  })

  it('returns empty string when both null', () => {
    const d = { ...baseDraft(), generated_output: null }
    expect(draftDisplayOutput(d)).toBe('')
  })

  it('draftIsAutomationGenerated is true when automation_id is set', () => {
    expect(draftIsAutomationGenerated(baseDraft())).toBe(false)
    expect(draftIsAutomationGenerated({ ...baseDraft(), automation_id: 'auto-reply-nuit' })).toBe(
      true
    )
    expect(draftIsAutomationGenerated({ ...baseDraft(), automation_id: '' })).toBe(false)
  })
})

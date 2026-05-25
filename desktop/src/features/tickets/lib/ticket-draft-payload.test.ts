import { describe, expect, it } from 'bun:test'

import {
  buildEditDraftPayload,
  buildFeedbackDraftPayload,
  buildGenerationDraftPayload,
  canPersistTicketDraft
} from './ticket-draft-payload'

describe('ticket-draft-payload', () => {
  it('buildGenerationDraftPayload sets save_kind generation', () => {
    expect(
      buildGenerationDraftPayload({
        id_reclamation: ' REQ-1 ',
        id_skill: 'ticket.answer-ticket',
        generated_output: 'o',
        generated_reasoning: 'r',
        generated_duration_ms: 99
      })
    ).toEqual({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o',
      generated_reasoning: 'r',
      generated_duration_ms: 99
    })
  })

  it('buildEditDraftPayload sets save_kind edit', () => {
    expect(
      buildEditDraftPayload({
        id_reclamation: 'REQ-2',
        id_skill: 'ticket.write-memo',
        edited_output: 'eo'
      })
    ).toEqual({
      save_kind: 'edit',
      id_reclamation: 'REQ-2',
      id_skill: 'ticket.write-memo',
      edited_output: 'eo'
    })
  })

  it('canPersistTicketDraft requires output step and ticket id', () => {
    expect(canPersistTicketDraft('REQ-1', true)).toBe(true)
    expect(canPersistTicketDraft('REQ-1', false)).toBe(false)
    expect(canPersistTicketDraft('  ', true)).toBe(false)
  })

  it('buildFeedbackDraftPayload sets save_kind feedback', () => {
    expect(
      buildFeedbackDraftPayload({
        id_reclamation: ' REQ-3 ',
        id_skill: 'ticket.answer-ticket',
        feedback_rating: 4,
        feedback_comment: 'Bien'
      })
    ).toEqual({
      save_kind: 'feedback',
      id_reclamation: 'REQ-3',
      id_skill: 'ticket.answer-ticket',
      feedback_rating: 4,
      feedback_comment: 'Bien'
    })
  })
})

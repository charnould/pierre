import { describe, expect, it } from 'bun:test'

import type { TicketDraft } from '@/shared/types/ticket-draft'

import { resolveDraftToLoad } from './resolve-draft-to-load'

function draft(partial: Partial<TicketDraft> & Pick<TicketDraft, 'id_skill'>): TicketDraft {
  return {
    id_reclamation: 'REQ-1',
    channel: null,
    generated_output: 'o',
    generated_reasoning: null,
    generated_duration_ms: null,
    generated_at: '2026-01-01T00:00:00.000Z',
    generated_by: 'u@x.com',
    automation_id: null,
    edited_output: null,
    edited_at: null,
    edited_by: null,
    feedback_rating: null,
    feedback_comment: null,
    feedback_at: null,
    feedback_by: null,
    ...partial
  }
}

describe('resolveDraftToLoad', () => {
  it('returns preferred format when draft exists', () => {
    const drafts = [
      draft({ id_skill: 'ticket.answer-ticket', channel: 'email' }),
      draft({ id_skill: 'ticket.write-memo' })
    ]
    const result = resolveDraftToLoad(drafts, 'ticketReplyEmail')
    expect(result?.format).toBe('ticketReplyEmail')
    expect(result?.id_skill).toBe('ticket.answer-ticket')
  })

  it('falls back to first available format N then P then I then R', () => {
    const drafts = [draft({ id_skill: 'ticket.rewrite-ticket' })]
    const result = resolveDraftToLoad(drafts, 'ticketReplyEmail')
    expect(result?.format).toBe('ticketRewriteTicket')
  })

  it('falls back from email to letter when only letter answer draft exists', () => {
    const drafts = [draft({ id_skill: 'ticket.answer-ticket', channel: 'letter' })]
    const result = resolveDraftToLoad(drafts, 'ticketReplyEmail')
    expect(result?.format).toBe('ticketReplyLetter')
    const letter = resolveDraftToLoad(drafts, 'ticketReplyLetter')
    expect(letter?.format).toBe('ticketReplyLetter')
  })

  it('returns null when no drafts match', () => {
    expect(resolveDraftToLoad([], 'ticketReplyEmail')).toBeNull()
  })
})

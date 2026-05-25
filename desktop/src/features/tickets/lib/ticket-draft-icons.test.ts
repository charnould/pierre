import { describe, expect, it } from 'bun:test'

import { draftHasFormat, draftIsAutomation } from './ticket-draft-icons'

describe('draftIsAutomation', () => {
  it('is false without automation skills', () => {
    expect(
      draftIsAutomation('ticketReplyEmail', ['ticket.answer-ticket'], 'email', undefined)
    ).toBe(false)
  })

  it('is true for email answer when automation on answer-ticket', () => {
    expect(
      draftIsAutomation('ticketReplyEmail', ['ticket.answer-ticket'], 'email', [
        'ticket.answer-ticket'
      ])
    ).toBe(true)
  })

  it('is false for letter when automation draft is email channel', () => {
    expect(
      draftIsAutomation('ticketReplyLetter', ['ticket.answer-ticket'], 'email', [
        'ticket.answer-ticket'
      ])
    ).toBe(false)
    expect(draftHasFormat(['ticket.answer-ticket'], 'ticketReplyLetter', 'email')).toBe(false)
  })

  it('is true for letter when channel is letter', () => {
    expect(
      draftIsAutomation('ticketReplyLetter', ['ticket.answer-ticket'], 'letter', [
        'ticket.answer-ticket'
      ])
    ).toBe(true)
  })

  it('is true for memo when memo skill is automated', () => {
    expect(
      draftIsAutomation('ticketWriteMemo', ['ticket.write-memo'], null, ['ticket.write-memo'])
    ).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'

import {
  KNOWLEDGE_SKILL,
  TICKET_SKILL_KEYS,
  formatFromDraft,
  formatToWire,
  skillHasDocxTemplate
} from './knowledge-skills'

describe('KNOWLEDGE_SKILL ids', () => {
  test('expose customization ids for wire skills', () => {
    expect(KNOWLEDGE_SKILL.ticketAnswerTicket).toBe('ticket.answer-ticket')
    expect(KNOWLEDGE_SKILL.ticketWriteMemo).toBe('ticket.write-memo')
    expect(KNOWLEDGE_SKILL.ticketSummarizeTicket).toBe('ticket.summarize-ticket')
  })

  test('uses unified about.summary skill', () => {
    expect(KNOWLEDGE_SKILL.aboutSummary).toBe('about.summary')
  })
})

describe('TICKET_SKILL_KEYS', () => {
  test('exposes three UI format keys', () => {
    expect(TICKET_SKILL_KEYS).toHaveLength(3)
  })
})

describe('formatToWire', () => {
  test('maps numérique and papier to answer-ticket with channel', () => {
    expect(formatToWire('ticketReplyEmail')).toEqual({
      id_skill: 'ticket.answer-ticket',
      channel: 'email'
    })
    expect(formatToWire('ticketReplyLetter')).toEqual({
      id_skill: 'ticket.answer-ticket',
      channel: 'letter'
    })
  })

  test('maps memo to its skill', () => {
    expect(formatToWire('ticketWriteMemo')).toEqual({ id_skill: 'ticket.write-memo' })
  })
})

describe('formatFromDraft', () => {
  test('restores UI format from draft row', () => {
    expect(formatFromDraft('ticket.answer-ticket', 'letter')).toBe('ticketReplyLetter')
    expect(formatFromDraft('ticket.answer-ticket', 'email')).toBe('ticketReplyEmail')
    expect(formatFromDraft('ticket.write-memo')).toBe('ticketWriteMemo')
  })
})

describe('skillHasDocxTemplate', () => {
  test('answer-ticket has template', () => {
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketAnswerTicket)).toBe(true)
  })

  test('write-memo, summarize-ticket, and about have no template', () => {
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketWriteMemo)).toBe(false)
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketSummarizeTicket)).toBe(false)
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.aboutSummary)).toBe(false)
  })
})

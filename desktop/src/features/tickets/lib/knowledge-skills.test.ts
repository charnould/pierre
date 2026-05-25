import { describe, expect, test } from 'bun:test'

import {
  KNOWLEDGE_SKILL,
  TICKET_SKILL_KEYS,
  formatFromDraft,
  formatToWire,
  ticketSkillKeyActions,
  skillHasDocxTemplate
} from './knowledge-skills'

describe('KNOWLEDGE_SKILL ids', () => {
  test('expose customization ids for wire skills', () => {
    expect(KNOWLEDGE_SKILL.ticketAnswerTicket).toBe('ticket.answer-ticket')
    expect(KNOWLEDGE_SKILL.ticketWriteMemo).toBe('ticket.write-memo')
    expect(KNOWLEDGE_SKILL.ticketRewriteTicket).toBe('ticket.rewrite-ticket')
  })

  test('uses unified about.summary skill', () => {
    expect(KNOWLEDGE_SKILL.aboutSummary).toBe('about.summary')
  })
})

describe('TICKET_SKILL_KEYS', () => {
  test('exposes four UI format keys', () => {
    expect(TICKET_SKILL_KEYS).toHaveLength(4)
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

  test('maps memo and rewrite to their skills', () => {
    expect(formatToWire('ticketWriteMemo')).toEqual({ id_skill: 'ticket.write-memo' })
    expect(formatToWire('ticketRewriteTicket')).toEqual({ id_skill: 'ticket.rewrite-ticket' })
  })
})

describe('formatFromDraft', () => {
  test('restores UI format from draft row', () => {
    expect(formatFromDraft('ticket.answer-ticket', 'letter')).toBe('ticketReplyLetter')
    expect(formatFromDraft('ticket.answer-ticket', 'email')).toBe('ticketReplyEmail')
    expect(formatFromDraft('ticket.write-memo')).toBe('ticketWriteMemo')
  })
})

describe('ticketSkillKeyActions', () => {
  test('maps hotkeys to skill setters', () => {
    let skill: string | undefined
    const actions = ticketSkillKeyActions((s) => {
      skill = s
    })
    actions.a()
    expect(skill).toBe('ticketReplyEmail')
    actions.c()
    expect(skill).toBe('ticketRewriteTicket')
    actions.d()
    expect(skill).toBe('ticketWriteMemo')
  })
})

describe('skillHasDocxTemplate', () => {
  test('answer-ticket has template', () => {
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketAnswerTicket)).toBe(true)
  })

  test('write-memo, rewrite-ticket, and about have no template', () => {
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketWriteMemo)).toBe(false)
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.ticketRewriteTicket)).toBe(false)
    expect(skillHasDocxTemplate(KNOWLEDGE_SKILL.aboutSummary)).toBe(false)
  })
})

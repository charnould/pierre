import { describe, expect, test } from 'bun:test'

import { KNOWLEDGE_SKILL } from '@/features/tickets/lib/knowledge-skills'

import { skillDocxTemplateUrl } from './useWorkflowExport'

describe('skillDocxTemplateUrl', () => {
  test('answer-ticket uses ticket.answer-ticket template', () => {
    const url = skillDocxTemplateUrl('https://pierre.example', KNOWLEDGE_SKILL.ticketAnswerTicket)
    expect(url).toBe(
      'https://pierre.example/customization/skills/ticket.answer-ticket/template.docx'
    )
  })
})

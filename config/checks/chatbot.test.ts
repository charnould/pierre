import { expect, test } from 'bun:test'

import { ChatbotConfig, chatbotSiteFields } from '../../server/utils/_schema'

const shared = {
  display: 'X',
  community_knowledge: false,
  trace: 'none' as const,
  attachments: true,
  greetings: ['Bonjour'],
  examples: ['Une question'],
  disclaimer: 'Vérifier.'
}

test('chatbot schema accepts valid configs and rejects unknown fields', () => {
  expect(ChatbotConfig.safeParse({ id: 'default', ...shared }).success).toBe(true)
  expect(ChatbotConfig.safeParse({ id: 'interne', ...shared }).success).toBe(true)
  expect(ChatbotConfig.safeParse({ id: 'default', ...shared, enabled: true }).success).toBe(false)
})

test('chatbotSiteFields hides blank chrome', () => {
  expect(
    chatbotSiteFields({
      id: 'interne',
      ...shared,
      greetings: ['  ', 'Bonjour'],
      examples: null,
      disclaimer: '  '
    }).greetings
  ).toEqual(['Bonjour'])
})

import { expect, test } from 'bun:test'

import {
  chatbotSiteFields,
  DefaultChatbotConfig,
  InternalChatbotConfig
} from '../../server/utils/_schema'

const shared = {
  display: 'X',
  community_knowledge: false,
  reasoning_effort: 'medium' as const,
  trace: 'none' as const,
  attachments: true,
  greetings: ['Bonjour'],
  examples: ['Une question'],
  disclaimer: 'Vérifier.'
}

test('default schema requires enabled', () => {
  expect(DefaultChatbotConfig.safeParse({ id: 'default', ...shared }).success).toBe(false)
  expect(DefaultChatbotConfig.safeParse({ id: 'default', ...shared, enabled: true }).success).toBe(
    true
  )
})

test('internal schema rejects public-only fields', () => {
  expect(InternalChatbotConfig.safeParse({ id: 'interne', ...shared }).success).toBe(true)
  expect(InternalChatbotConfig.safeParse({ id: 'interne', ...shared, enabled: true }).success).toBe(
    false
  )
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

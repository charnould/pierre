import { expect, test } from 'bun:test'

import { AIContext, type ChatbotConfig } from '../../../utils/_schema'

const config: ChatbotConfig = {
  id: 'default',
  display: 'PIERRE',
  enabled: true,
  community_knowledge: true,
  trace: 'none',
  attachments: false,
  greetings: ['Bonjour'],
  examples: ['Question'],
  disclaimer: 'Vérifier.'
}

test('AIContext keeps LLM fields and fills defaults', async () => {
  expect(
    await AIContext.parseAsync({
      role: 'user',
      conv_id: '22222',
      config,
      content: 'bonjour',
      custom_data: { raw: ['Julie', '456.56'] }
    })
  ).toEqual({
    chunks: { community: [], proprietary: [] },
    config,
    content: 'bonjour',
    conv_id: '22222',
    conversation: [],
    custom_data: { raw: ['Julie', '456.56'], transformed: '' },
    user_email: null,
    query: null,
    role: 'user'
  })
})

import { expect, test } from 'bun:test'

import { AIContext, type ChatbotConfig } from '../../../utils/_schema'

const config: ChatbotConfig = {
  id: 'default',
  display: 'PIERRE',
  enabled: true,
  community_knowledge: true,
  reasoning_effort: 'medium',
  trace: 'none',
  attachments: false,
  greetings: ['Bonjour'],
  examples: ['Question'],
  disclaimer: 'Vérifier.'
}

test('should AIContext parse correctly', async () => {
  expect(
    await AIContext.parseAsync({
      role: 'user',
      conv_id: '22222',
      config: config,
      content: 'bonjour',
      custom_data: { raw: ['Julie', '456.56'] }
    })
  ).toMatchSnapshot()
})

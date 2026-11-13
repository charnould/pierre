import { describe, expect, test } from 'bun:test'

import type { ChatbotConfig, User } from '../../../utils/_schema'
import { resolveAuthorizedChatConfig } from '../../../utils/chat-config-access'

const user = (chatbotIds: string[]): User => ({
  email: 'alice@example.org',
  isAdministrator: false,
  moduleIds: [],
  chatbotIds
})

const publicOn: ChatbotConfig = {
  id: 'default',
  display: 'Public',
  community_knowledge: true,
  trace: 'none',
  attachments: true,
  examples: [],
  disclaimer: null
}

const interne: ChatbotConfig = {
  id: 'interne',
  display: 'Interne',
  community_knowledge: false,
  trace: 'none',
  attachments: false
}

const load =
  (configs: Record<string, ChatbotConfig>) =>
  async (id: string): Promise<ChatbotConfig> => {
    const config = configs[id]
    if (!config) throw new Error('missing')
    return config
  }

describe('resolveAuthorizedChatConfig', () => {
  test('allows anonymous and session access to the public agent', async () => {
    const loader = load({ default: publicOn })
    expect(await resolveAuthorizedChatConfig('default', null, loader)).toEqual(publicOn)
    expect(await resolveAuthorizedChatConfig('default', user([]), loader)).toEqual(publicOn)
  })

  test('allows an assigned internal chatbot and forbids others', async () => {
    const loader = load({ interne })
    expect(await resolveAuthorizedChatConfig('interne', user(['interne']), loader)).toEqual(interne)
    await expect(resolveAuthorizedChatConfig('interne', user([]), loader)).rejects.toMatchObject({
      status: 403
    })
    await expect(resolveAuthorizedChatConfig('interne', null, loader)).rejects.toMatchObject({
      status: 403
    })
  })
})

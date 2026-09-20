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
  enabled: true,
  community_knowledge: true,
  reasoning_effort: 'medium',
  trace: 'none',
  attachments: true,
  greeting: [],
  examples: [],
  disclaimer: null,
  custom_data: {}
}

const publicOff: ChatbotConfig = { ...publicOn, enabled: false }

const interne: ChatbotConfig = {
  id: 'interne',
  display: 'Interne',
  community_knowledge: false,
  reasoning_effort: 'low',
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
  test('allows anonymous and session access to default when enabled', async () => {
    const loader = load({ default: publicOn })
    expect(await resolveAuthorizedChatConfig('default', null, loader)).toEqual(publicOn)
    expect(await resolveAuthorizedChatConfig('default', user([]), loader)).toEqual(publicOn)
  })

  test('forbids default when disabled', async () => {
    const loader = load({ default: publicOff })
    await expect(resolveAuthorizedChatConfig('default', null, loader)).rejects.toMatchObject({
      status: 403
    })
    await expect(
      resolveAuthorizedChatConfig('default', user(['interne']), loader)
    ).rejects.toMatchObject({
      status: 403
    })
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

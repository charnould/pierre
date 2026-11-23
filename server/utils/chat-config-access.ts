import { type ChatbotConfig, isDefaultChatbotConfig, type User } from './_schema'
import { loadChatbotConfig } from './chatbot-config'

const CONFIG_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

export class ChatConfigAccessError extends Error {
  constructor(
    readonly code: 'invalid_config' | 'forbidden',
    message: string,
    readonly status: 400 | 403
  ) {
    super(message)
    this.name = 'ChatConfigAccessError'
  }
}

export async function resolveAuthorizedChatConfig(
  requestedId: string,
  user: User | null | undefined,
  loadConfig: (configName: string) => Promise<unknown> = loadChatbotConfig
): Promise<ChatbotConfig> {
  if (!CONFIG_ID.test(requestedId)) {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  let config: ChatbotConfig
  try {
    config = (await loadConfig(requestedId)) as ChatbotConfig
  } catch {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  if (!config || config.id !== requestedId) {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  const isAllowed =
    requestedId === 'default'
      ? isDefaultChatbotConfig(config)
      : Boolean(user?.chatbotIds.includes(requestedId))

  if (!isAllowed) {
    throw new ChatConfigAccessError('forbidden', 'Chatbot configuration access denied', 403)
  }

  return config
}

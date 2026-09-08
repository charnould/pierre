import type { Config, Parsed_User } from './_schema'
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
  user: Parsed_User | null | undefined,
  loadConfig: (configName: string) => Promise<unknown> = loadChatbotConfig
): Promise<Config> {
  if (!CONFIG_ID.test(requestedId)) {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  let config: Config
  try {
    config = (await loadConfig(requestedId)) as Config
  } catch {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  if (!config || config.id !== requestedId) {
    throw new ChatConfigAccessError('invalid_config', 'Invalid chatbot configuration', 400)
  }

  const isAllowed = user ? user.config.includes(requestedId) : config.protected !== true
  if (!isAllowed) {
    throw new ChatConfigAccessError('forbidden', 'Chatbot configuration access denied', 403)
  }

  return config
}

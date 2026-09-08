import { existsSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { ChatbotConfig } from './_schema'
import { CUSTOMIZATION_DIR, resolvePathWithin } from './paths'

const CONFIG_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/

export class ChatbotConfigError extends Error {
  constructor(
    readonly code: 'invalid_config' | 'config_not_found',
    message: string,
    readonly status: 400 | 404
  ) {
    super(message)
    this.name = 'ChatbotConfigError'
  }
}

export function assertCanonicalChatbotId(value: string): string {
  const id = value.trim()
  if (!CONFIG_ID.test(id)) {
    throw new ChatbotConfigError('invalid_config', 'Invalid chatbot configuration', 400)
  }
  return id
}

export async function loadChatbotConfig(requestedId: string): Promise<ChatbotConfig> {
  const id = assertCanonicalChatbotId(requestedId)
  const configPath = resolvePathWithin(CUSTOMIZATION_DIR, 'chatbots', id, 'config.ts')
  if (!existsSync(configPath)) {
    throw new ChatbotConfigError('config_not_found', 'Chatbot configuration not found', 404)
  }

  const realConfigPath = realpathSync(configPath)
  resolvePathWithin(CUSTOMIZATION_DIR, 'chatbots', realConfigPath)

  try {
    const parsed = ChatbotConfig.safeParse(
      (await import(pathToFileURL(realConfigPath).href)).default
    )
    if (!parsed.success || parsed.data.id !== id) {
      throw new ChatbotConfigError('invalid_config', 'Invalid chatbot configuration', 400)
    }
    return parsed.data
  } catch (error) {
    if (error instanceof ChatbotConfigError) throw error
    throw new ChatbotConfigError('config_not_found', 'Chatbot configuration not found', 404)
  }
}

import { existsSync, realpathSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  DefaultChatbotConfig,
  InternalChatbotConfig,
  isDefaultChatbotConfig,
  type ChatbotConfig,
  type User
} from './_schema'
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

function assertCanonicalChatbotId(value: string): string {
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
    const raw = (await import(pathToFileURL(realConfigPath).href)).default
    const schema = id === 'default' ? DefaultChatbotConfig : InternalChatbotConfig
    const parsed = schema.safeParse(raw)
    if (!parsed.success || parsed.data.id !== id) {
      throw new ChatbotConfigError('invalid_config', 'Invalid chatbot configuration', 400)
    }
    return parsed.data
  } catch (error) {
    if (error instanceof ChatbotConfigError) throw error
    throw new ChatbotConfigError('config_not_found', 'Chatbot configuration not found', 404)
  }
}

export async function listChatbotSummaries(): Promise<Array<{ id: string; label: string }>> {
  const entries = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))
  const configs = await Promise.all(
    entries.map(async (entry) => {
      if (entry === 'default') return null
      if (!existsSync(join(CUSTOMIZATION_DIR, 'chatbots', entry, 'config.ts'))) return null
      const config = await loadChatbotConfig(entry)
      return { id: config.id, label: config.display }
    })
  )
  return configs
    .filter((config): config is NonNullable<typeof config> => config !== null)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export async function listAccessibleChatbots(
  user: User,
  loadConfig: (id: string) => Promise<ChatbotConfig> = loadChatbotConfig
): Promise<ChatbotConfig[]> {
  const assigned = [...new Set(user.chatbotIds.filter((id) => id !== 'default'))]
  const configs: ChatbotConfig[] = []

  try {
    const publicConfig = await loadConfig('default')
    if (isDefaultChatbotConfig(publicConfig) && publicConfig.enabled) {
      configs.push(publicConfig)
    }
  } catch {
    // Public chatbot is optional when disabled or missing.
  }

  for (const id of assigned) {
    try {
      configs.push(await loadConfig(id))
    } catch {
      // Assigned folder may have been removed.
    }
  }

  return configs.sort((a, b) => a.display.localeCompare(b.display, 'fr'))
}

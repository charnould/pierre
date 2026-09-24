import {
  DefaultChatbotConfig,
  InternalChatbotConfig,
  isDefaultChatbotConfig,
  type ChatbotConfig,
  type User
} from './_schema'
import {
  chatbotAgents,
  defaultChatbotReady,
  internalChatbot,
  listInternalChatbots,
  readSetupBytes
} from './setup-store'

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

function withoutInstructions(root: any): Record<string, unknown> {
  const { instructions: _instructions, ...config } = root
  return config
}

export async function loadChatbotConfig(requestedId: string): Promise<ChatbotConfig> {
  const id = assertCanonicalChatbotId(requestedId)
  const root = id === 'default' ? defaultChatbotReady() : internalChatbot(id)
  if (!root)
    throw new ChatbotConfigError('config_not_found', 'Chatbot configuration not found', 404)
  const schema = id === 'default' ? DefaultChatbotConfig : InternalChatbotConfig
  const parsed = schema.safeParse(withoutInstructions(root))
  if (!parsed.success || parsed.data.id !== id) {
    throw new ChatbotConfigError('invalid_config', 'Invalid chatbot configuration', 400)
  }
  return parsed.data
}

export async function listChatbotSummaries(): Promise<Array<{ id: string; label: string }>> {
  return listInternalChatbots().map((config) => ({ id: config.id, label: config.display }))
}

export function chatbotInstructions(id: string): string {
  return chatbotAgents(id)
}

export function publicIcon(): Uint8Array | null {
  if (!defaultChatbotReady()) return null
  return readSetupBytes('chatbots/icons/icon.svg')
}

export async function listAccessibleChatbots(
  user: User,
  loadConfig: (id: string) => Promise<ChatbotConfig> = loadChatbotConfig
): Promise<ChatbotConfig[]> {
  const assigned = [...new Set(user.chatbotIds.filter((id) => id !== 'default'))]
  const configs: ChatbotConfig[] = []

  try {
    const publicConfig = await loadConfig('default')
    if (isDefaultChatbotConfig(publicConfig) && publicConfig.enabled) configs.push(publicConfig)
  } catch {
    // Public chatbot is absent until its entry is ready and enabled.
  }

  for (const id of assigned) {
    try {
      configs.push(await loadConfig(id))
    } catch {
      // Assigned chatbot may have been removed.
    }
  }

  return configs.sort((a, b) => a.display.localeCompare(b.display, 'fr'))
}

import type { Context } from 'hono'

import type { ChatbotConfig, User } from '../../utils/_schema'
import { buildChatBoot } from '../../utils/chat-boot'
import { ChatConfigAccessError, resolveAuthorizedChatConfig } from '../../utils/chat-config-access'
import {
  ChatbotConfigError,
  listAccessibleChatbots,
  loadChatbotConfig
} from '../../utils/chatbot-config'

type BootDependencies = {
  loadConfig: (id: string) => Promise<ChatbotConfig>
  listAccessible: typeof listAccessibleChatbots
}

const defaultDependencies: BootDependencies = {
  loadConfig: loadChatbotConfig,
  listAccessible: listAccessibleChatbots
}

export const createGetAiBootController =
  (dependencies: Partial<BootDependencies> = {}) =>
  async (c: Context) => {
    const deps = { ...defaultDependencies, ...dependencies }
    try {
      const user = c.get('user') as User
      const accessible = await deps.listAccessible(user, deps.loadConfig)
      if (accessible.length === 0) {
        throw new ChatConfigAccessError('forbidden', 'Chatbot configuration access denied', 403)
      }

      const queryConfig = c.req.query('config')
      const active_config = queryConfig
        ? await resolveAuthorizedChatConfig(queryConfig, user, deps.loadConfig)
        : (user.chatbotIds
            .filter((id) => id !== 'default')
            .map((id) => accessible.find((config) => config.id === id))
            .find((config) => config !== undefined) ??
          accessible.find((config) => config.id === 'default') ??
          accessible[0]!)

      return c.json(buildChatBoot(active_config, accessible))
    } catch (error) {
      if (error instanceof ChatConfigAccessError || error instanceof ChatbotConfigError) {
        return c.json({ error: { code: error.code, message: error.message } }, error.status)
      }
      console.error('[get.ai.boot] Error:', error)
      return c.json({ error: 'Internal Server Error' }, 500)
    }
  }

/**
 * Returns chat boot JSON for native clients (e.g. Electron Discuter panel).
 */
export const controller = createGetAiBootController()

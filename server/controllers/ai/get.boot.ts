import type { Context } from 'hono'

import type { Config, Parsed_User } from '../../utils/_schema'
import { buildChatBoot } from '../../utils/chat-boot'
import { ChatConfigAccessError, resolveAuthorizedChatConfig } from '../../utils/chat-config-access'
import { ChatbotConfigError, loadChatbotConfig } from '../../utils/chatbot-config'
import { get_displayable_configs } from '../chat/get'

async function resolveActiveConfig(c: Context): Promise<Config> {
  const user = c.get('user') as Parsed_User | null
  const queryConfig = c.req.query('config')

  if (queryConfig === undefined) {
    const first = user?.config?.[0]
    if (first) {
      try {
        return await loadChatbotConfig(first)
      } catch {
        // Fall through to default when the stored profile no longer exists.
      }
    }
    return loadChatbotConfig('default')
  }

  return resolveAuthorizedChatConfig(queryConfig, user)
}

/**
 * Returns chat boot JSON for native clients (e.g. Electron Discuter panel).
 */
export const controller = async (c: Context) => {
  try {
    const user = c.get('user') as Parsed_User | null
    const active_config = await resolveActiveConfig(c)
    const displayable_configs = await get_displayable_configs({ user, active_config })

    const dataParam =
      c.req.query('data') === 'undefined' || c.req.query('data') === undefined
        ? ''
        : (c.req.query('data') ?? '')

    return c.json(buildChatBoot(active_config, displayable_configs, dataParam))
  } catch (error) {
    if (error instanceof ChatConfigAccessError || error instanceof ChatbotConfigError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.status)
    }
    console.error('[get.ai.boot] Error:', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
}

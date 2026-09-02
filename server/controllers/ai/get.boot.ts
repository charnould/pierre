import type { Context } from 'hono'

import type { Config, Parsed_User } from '../../utils/_schema'
import { buildChatBootData } from '../../utils/chat-boot'
import { get_displayable_configs } from '../chat/get'

async function resolveActiveConfig(c: Context): Promise<Config> {
  const user = c.get('user') as Parsed_User | null
  const queryConfig = c.req.query('config')

  if (queryConfig === undefined) {
    if (user?.config?.length) {
      try {
        return (await import(`../../../customization/chatbots/${user.config[0]}/config`)).default
      } catch {
        return (await import('../../../customization/chatbots/default/config')).default
      }
    }
    return (await import('../../../customization/chatbots/default/config')).default
  }

  try {
    if (user !== null && user !== undefined) {
      if (user.config.includes(queryConfig)) {
        return (await import(`../../../customization/chatbots/${queryConfig}/config`)).default
      }
      return (await import(`../../../customization/chatbots/${user.config[0]}/config`)).default
    }
    return (await import(`../../../customization/chatbots/${queryConfig}/config`)).default
  } catch {
    return (await import('../../../customization/chatbots/default/config')).default
  }
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

    return c.json(buildChatBootData(active_config, displayable_configs, dataParam))
  } catch (error) {
    console.error('[get.ai.boot] Error:', error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
}

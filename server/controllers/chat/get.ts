import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'
import { z } from 'zod'

import type { Config, Parsed_User } from '../../utils/_schema'
import { loadChatbotConfig } from '../../utils/chatbot-config'
import { CUSTOMIZATION_DIR } from '../../utils/paths'
import { view } from '../../views/chat.index'

/**
 * Handles the GET request for the index route.
 *
 * Retrieves the current user and the requested configuration from the context,
 * dynamically imports the corresponding configuration file, and fetches the list
 * of displayable configurations for the user. Renders the view with the active
 * and displayable configurations. Handles and logs errors, returning a generic
 * error message on failure.
 *
 * @param c - The request context containing user and query information.
 * @returns An HTML response with the rendered view or an error message.
 */
export const controller = async (c: Context) => {
  try {
    const config = c.req.query('config') as string
    const active_config = await loadChatbotConfig(config)
    const dataParam =
      c.req.query('data') === 'undefined' || c.req.query('data') === undefined
        ? ''
        : (c.req.query('data') ?? '')
    return c.html(view({ active_config, displayable_configs: [], dataParam }))
  } catch (error) {
    console.error('Error loading configurations:', error)
    return c.html('<p>Internal Server Error</p>', 500)
  }
}

//
//
//
// HELPERS
//
//
//

/**
 * Retrieves a list of displayable configuration objects based on the provided user and active configuration.
 *
 * This function reads all configuration files from the `assets` directory, dynamically imports each config,
 * and determines which configurations should be displayed to the user. The resulting list is filtered to include
 * only those configurations that are either active or marked to be shown, and for which the user is authorized.
 * The final list is sorted alphabetically by the display name.
 *
 * @param params - An object containing:
 *   - `user`: The parsed user object or `null` if no user is authenticated.
 *   - `active_config`: The currently active configuration.
 * @returns A promise that resolves to an array of displayable configuration objects.
 * @throws Will throw an error if configuration files cannot be loaded.
 */
export const get_displayable_configs = async (params: {
  user: Parsed_User | null
  active_config: Config
}): Promise<Displayable_configs> => {
  try {
    const assets = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))
    const configs = await Promise.all(
      assets.map(async (file) => {
        const path = join(CUSTOMIZATION_DIR, 'chatbots', file, 'config.ts')
        if (!(await Bun.file(path).exists())) return null
        const config: Config = (await import(`../../../customization/chatbots/${file}/config`))
          .default
        const should_be_displayed =
          params.user != null
            ? params.user.config.includes(config.id)
            : params.active_config.show.includes(config.id)
        const user_is_authorized =
          params.user != null ? params.user.config.includes(config.id) : true
        const is_active = file === params.active_config.id

        return {
          id: config.id,
          is_active: is_active,
          display: config.display,
          user_is_authorized: user_is_authorized,
          should_be_displayed: should_be_displayed
        }
      })
    )

    return configs
      .filter((config): config is NonNullable<typeof config> => config !== null)
      .filter(({ is_active, should_be_displayed }) => is_active || should_be_displayed)
      .filter(({ user_is_authorized }) => user_is_authorized)
      .sort((a, b) => a.display.localeCompare(b.display))
  } catch (error) {
    console.error('Failed to load configurations:', error)
    throw new Error('Unable to load configuration files')
  }
}

/**
 * Zod Schema definition for the available configurations.
 * This schema is used to enforce type safety and validate data integrity.
 */
export const Displayable_configs = z.array(
  z.object({
    id: z.string(),
    display: z.string(),
    is_active: z.boolean(),
    user_is_authorized: z.boolean(),
    should_be_displayed: z.boolean()
  })
)

export type Displayable_configs = z.infer<typeof Displayable_configs>

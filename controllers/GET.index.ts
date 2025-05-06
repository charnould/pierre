import { readdir } from 'node:fs/promises'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Config } from '../utils/_schema'
import { view } from '../views/index'

/**
 * Handles an HTTP GET request to render a view with the active configuration
 * and a list of available configurations.
 *
 * @param c - The context object containing the request and response details.
 * @returns A promise that resolves to an HTML response with the rendered view.
 *
 * The function dynamically imports the active configuration based on the
 * `config` query parameter in the request. It then retrieves a list of
 * available configurations and renders a view with the active configuration
 * and the list of available configurations.
 *
 * @throws Will throw an error if the `config` query parameter is invalid or
 * if the dynamic import fails.
 */
export const controller = async (c: Context) => {
  const config = c.req.query('config') as string
  const active_config = (await import(`../assets/${config}/config`)).default as Config
  const available_configs = await get_available_configs(active_config)
  return c.html(view({ active_config, available_configs }))
}

//
//
//
// HELPERS
//
//
//

/**
 * Retrieves a list of available configurations based on the active configuration.
 *
 * @param active_config - The active configuration object.
 * @returns A promise that resolves to an array of available configurations.
 *
 * The function reads the configuration files from the `assets` directory,
 * imports each configuration, and filters them based on whether they should
 * be displayed and whether they are currently active.
 *
 * @throws Will throw an error if reading the directory or importing the
 * configuration files fails.
 */
export const get_available_configs = async (active_config: Config): Promise<Available_configs> => {
  try {
    const config_files = await readdir('assets')

    const configs = await Promise.all(
      config_files.map(async (file) => {
        const config: Config = (await import(`../assets/${file}/config`)).default
        const should_be_displayed = active_config.show.includes(config.id)
        const is_active = file === active_config.id

        return {
          id: config.id,
          is_active: is_active,
          display: config.display,
          should_be_displayed: should_be_displayed
        }
      })
    )

    return configs
      .filter(({ is_active, should_be_displayed }) => is_active || should_be_displayed)
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
export const Available_configs = z.array(
  z.object({
    id: z.string(),
    display: z.string(),
    is_active: z.boolean(),
    should_be_displayed: z.boolean()
  })
)

export type Available_configs = z.infer<typeof Available_configs>

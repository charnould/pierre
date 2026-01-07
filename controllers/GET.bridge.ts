import type { Context } from 'hono'
import { view } from '../views/admin.extension'
import { get_skills } from '../utils/handle-skill'

/**
 * Handles GET requests for the bridge endpoint.
 * Retrieves all skills with padding and renders them as HTML.
 *
 * @param c - The Hono context object containing request and response handlers
 * @returns A promise that resolves to an HTML response containing the rendered skills view
 * @throws Logs errors to console if skill retrieval fails
 */
export const controller = async (c: Context) => {
  try {
    const skills = await get_skills({ pad_to_length: true })
    return c.html(view(skills))
  } catch (e) {
    console.log(e)
  }
}

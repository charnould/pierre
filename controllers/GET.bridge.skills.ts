import type { Context } from 'hono'
import { get_skills } from '../utils/handle-skill'

/**
 * GET /bridge/skills controller
 *
 * Retrieves a list of all available skills.
 *
 * @param c - The Hono context object
 * @returns A JSON response containing the skills array
 * @throws Logs errors to console if the skills retrieval fails
 */
export const controller = async (c: Context) => {
  try {
    const skills = await get_skills({ pad_to_length: false })
    return c.json(skills)
  } catch (e) {
    console.log(e)
  }
}

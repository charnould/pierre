import type { Context } from 'hono'
import { save_skill } from '../utils/handle-skill'
import { Skill } from '../utils/_schema'

/**
 * Handles POST requests to process and save skill data from form submissions.
 *
 * Parses form data with array-like keys (skills[index][field]) into structured skill objects,
 * where field can be 'id', 'name', or 'skill'. Empty string values are converted to null.
 *
 * @param c - The Hono Context object containing the request and response
 * @returns A redirect response to '/a/bridge'
 *
 */
export const controller = async (c: Context) => {
  const skills: Skill[] = []
  const body = await c.req.formData()

  for (const [key, value] of body.entries()) {
    const m = key.match(/^skills\[(\d+)]\[(id|name|skill)]$/)
    if (!m) continue

    const index = Number(m[1])
    const field = m[2]

    skills[index] ??= {}
    skills[index][field] = value === '' ? null : value
  }

  for (const skill of skills.filter(Boolean)) await save_skill(skill)
  return c.redirect('/a/bridge')
}

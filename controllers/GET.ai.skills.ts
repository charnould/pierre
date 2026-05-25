import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import type { Context } from 'hono'

const PROJECT_ROOT = resolve(import.meta.dir, '..')

/**
 * GET /ai/skills
 *
 * Returns all available skills (folders under `customization/skills/`),
 * each with its `id` and `display` name from the corresponding `config.ts`.
 *
 * Response: [{ id: string, display: string, reasoning_display: 'off' | 'partial' | 'full' }]
 */
export const controller = async (c: Context) => {
  try {
    const skillsDir = join(PROJECT_ROOT, 'customization', 'skills')
    const entries = await readdir(skillsDir, { withFileTypes: true })

    const skillFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name)

    const skills: { id: string; display: string; reasoning_display: string }[] = []

    for (const folder of skillFolders) {
      const configPath = join(skillsDir, folder, 'config.ts')
      if (!existsSync(configPath)) continue
      try {
        const mod = await import(`../customization/skills/${folder}/config`)
        const cfg = mod.default as {
          id: string
          display: string
          reasoning_display?: string
        }
        skills.push({
          id: cfg.id,
          display: cfg.display,
          reasoning_display: cfg.reasoning_display ?? 'off'
        })
      } catch {
        // skip folders with broken configs
      }
    }

    return c.json(skills)
  } catch (e) {
    console.error('[GET.AI.SKILLS] Error:', e)
    return c.json([], 500)
  }
}

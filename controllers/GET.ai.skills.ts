import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import type { Context } from 'hono'

const PROJECT_ROOT = resolve(import.meta.dir, '..')

/**
 * GET /ai/skills
 *
 * Returns all available skills (folders starting with `skill_` under `assets/`),
 * each with its `id` and `display` name from the corresponding `config.ts`.
 *
 * Response: [{ id: string, display: string }]
 */
export const controller = async (c: Context) => {
  try {
    const assetsDir = join(PROJECT_ROOT, 'assets')
    const entries = await readdir(assetsDir, { withFileTypes: true })

    const skillFolders = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('skill_'))
      .map((e) => e.name)

    const skills: { id: string; display: string }[] = []

    for (const folder of skillFolders) {
      const configPath = join(assetsDir, folder, 'config.ts')
      if (!existsSync(configPath)) continue
      try {
        const mod = await import(`../assets/${folder}/config`)
        const cfg = mod.default as { id: string; display: string }
        skills.push({ id: cfg.id, display: cfg.display })
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

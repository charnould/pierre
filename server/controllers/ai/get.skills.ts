import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'

import type { TraceMode } from '../../../shared/chat'
import { SkillConfig } from '../../utils/_schema'
import { CUSTOMIZATION_DIR } from '../../utils/paths'

/**
 * GET /ai/skills
 *
 * Returns all available skills (folders under `customization/skills/`).
 */
export const controller = async (c: Context) => {
  try {
    const skillsDir = join(CUSTOMIZATION_DIR, 'skills')
    const entries = await readdir(skillsDir, { withFileTypes: true })

    const skillFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name)

    const skills: { id: string; display: string; trace: TraceMode }[] = []

    for (const folder of skillFolders) {
      const configPath = join(skillsDir, folder, 'config.ts')
      if (!(await Bun.file(configPath).exists())) continue
      try {
        const parsed = SkillConfig.safeParse(
          (await import(`../../../customization/skills/${folder}/config`)).default
        )
        if (!parsed.success) continue
        skills.push({
          id: parsed.data.id,
          display: parsed.data.display,
          trace: parsed.data.trace
        })
      } catch {
        // skip folders with broken configs
      }
    }

    return c.json(skills)
  } catch (e) {
    console.error('[get.ai.skills] Error:', e)
    return c.json([], 500)
  }
}

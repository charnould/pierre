import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'

import instanceConfig from '../../../../customization/config'
import repaymentConfig from '../../../../customization/repayments/config'
import ticketConfig from '../../../../customization/tickets/config'
import { CUSTOMIZATION_DIR, CUSTOMIZATION_SKILLS_DIR } from '../../../utils/paths'

export const controller = async (c: Context) => {
  try {
    const templatesDir = join(CUSTOMIZATION_DIR, 'repayments', 'templates')
    const templateNames = await readdir(templatesDir)
    const templates: Record<string, string> = {}
    for (const name of templateNames) {
      if (!name.endsWith('.md') && !name.endsWith('.json')) continue
      templates[name] = await Bun.file(join(templatesDir, name)).text()
    }

    const skillEntries = await readdir(CUSTOMIZATION_SKILLS_DIR, { withFileTypes: true })
    const docxSkillIds: string[] = []
    for (const entry of skillEntries) {
      if (!entry.isDirectory()) continue
      if (await Bun.file(join(CUSTOMIZATION_SKILLS_DIR, entry.name, 'template.docx')).exists()) {
        docxSkillIds.push(entry.name)
      }
    }

    return c.json({
      name: instanceConfig.name,
      tickets: ticketConfig,
      repayments: { ...repaymentConfig, templates },
      docxSkillIds
    })
  } catch (error) {
    console.error('[get.desktop.customization]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Impossible de lire la configuration.' } },
      500
    )
  }
}

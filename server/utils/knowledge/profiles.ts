import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import { DefaultChatbotConfig, InternalChatbotConfig, SkillConfig } from '../_schema'
import { CUSTOMIZATION_DIR } from '../paths'

export type KnowledgeProfile = {
  id: string
  label: string
  kind: 'chatbot' | 'skill'
  communityKnowledge: boolean
}

const loadConfig = async (path: string): Promise<unknown> => {
  const modulePath = pathToFileURL(path).href
  return (await import(modulePath)).default
}

export const listKnowledgeProfiles = async (): Promise<KnowledgeProfile[]> => {
  const profiles: KnowledgeProfile[] = []
  const groups = [
    { directory: join(CUSTOMIZATION_DIR, 'chatbots'), kind: 'chatbot' as const },
    { directory: join(CUSTOMIZATION_DIR, 'skills'), kind: 'skill' as const }
  ]

  for (const group of groups) {
    if (!existsSync(group.directory)) continue
    const entries = await readdir(group.directory, { withFileTypes: true })
    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      const configPath = join(group.directory, entry.name, 'config.ts')
      if (!existsSync(configPath)) continue
      try {
        const schema =
          group.kind === 'skill'
            ? SkillConfig
            : entry.name === 'default'
              ? DefaultChatbotConfig
              : InternalChatbotConfig
        const parsed = schema.safeParse(await loadConfig(configPath))
        if (!parsed.success) continue
        profiles.push({
          id: parsed.data.id,
          label: parsed.data.display,
          kind: group.kind,
          communityKnowledge: parsed.data.community_knowledge
        })
      } catch (error) {
        console.warn(
          `⚠️ Skipping invalid knowledge profile — ${relative(CUSTOMIZATION_DIR, configPath)}`
        )
        console.warn(error)
      }
    }
  }

  return profiles.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

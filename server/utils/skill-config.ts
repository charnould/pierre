import { existsSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import type { Config } from './_schema'
import { CUSTOMIZATION_SKILLS_DIR, resolvePathWithin } from './paths'

const CANONICAL_SKILL_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/

export class SkillRequestError extends Error {
  constructor(
    public readonly code: 'invalid_skill_id' | 'skill_not_found',
    message: string,
    public readonly status: 400 | 404
  ) {
    super(message)
    this.name = 'SkillRequestError'
  }
}

export function assertCanonicalSkillId(value: string): string {
  const skillId = value.trim()
  if (!CANONICAL_SKILL_ID.test(skillId)) {
    throw new SkillRequestError('invalid_skill_id', 'Skill ID is invalid', 400)
  }
  return skillId
}

export function assertMatchingSkillConfig(skillId: string, config: Pick<Config, 'id'>): void {
  if (config.id !== skillId) {
    throw new SkillRequestError('skill_not_found', 'Skill is not configured', 404)
  }
}

export async function loadConfiguredSkill(skillIdInput: string): Promise<Config> {
  const skillId = assertCanonicalSkillId(skillIdInput)
  const configPath = resolvePathWithin(CUSTOMIZATION_SKILLS_DIR, skillId, 'config.ts')
  if (!existsSync(configPath)) {
    throw new SkillRequestError('skill_not_found', 'Skill is not configured', 404)
  }

  const realConfigPath = realpathSync(configPath)
  resolvePathWithin(CUSTOMIZATION_SKILLS_DIR, realConfigPath)

  try {
    const config = (await import(pathToFileURL(realConfigPath).href)).default as Config
    assertMatchingSkillConfig(skillId, config)
    return config
  } catch (error) {
    if (error instanceof SkillRequestError) throw error
    throw new SkillRequestError('skill_not_found', 'Skill is not configured', 404)
  }
}

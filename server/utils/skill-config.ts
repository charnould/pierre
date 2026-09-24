import { isPromptId } from '../../shared/prompts'

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

export async function loadConfiguredSkill(
  skillIdInput: string
): Promise<{ id: string; trace: 'expanded' }> {
  const skillId = assertCanonicalSkillId(skillIdInput)
  if (!isPromptId(skillId)) {
    throw new SkillRequestError('skill_not_found', 'Skill is not configured', 404)
  }
  return { id: skillId, trace: 'expanded' }
}

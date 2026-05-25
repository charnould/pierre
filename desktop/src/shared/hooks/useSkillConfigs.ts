import { useEffect, useState } from 'react'

import type { ReasoningDisplay, SkillSummary } from '@/shared/types'

export type { SkillSummary }

function isSkillSummary(value: unknown): value is SkillSummary {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return typeof s.id === 'string' && typeof s.display === 'string'
}

export function useSkillConfigs(url: string | undefined) {
  const [byId, setById] = useState<Record<string, SkillSummary>>({})

  useEffect(() => {
    if (!url || !window.api?.getSkills) return
    void window.api.getSkills({ url }).then((skills) => {
      if (!Array.isArray(skills)) return
      const map: Record<string, SkillSummary> = {}
      for (const skill of skills) {
        if (isSkillSummary(skill)) {
          map[skill.id] = skill
        }
      }
      setById(map)
    })
  }, [url])

  return byId
}

export function reasoningDisplayForSkill(
  byId: Record<string, SkillSummary>,
  skillId: string
): ReasoningDisplay {
  return byId[skillId]?.reasoning_display ?? 'off'
}

/** Whether to capture reasoning_delta for this skill (handles API load race). */
export function captureReasoningForSkill(
  byId: Record<string, SkillSummary>,
  skillId: string
): boolean {
  const display = reasoningDisplayForSkill(byId, skillId)
  if (display !== 'off') return true
  if (Object.keys(byId).length > 0) return false
  return skillId.startsWith('ticket.')
}

export function reasoningCollapsibleMode(display: ReasoningDisplay): 'partial' | 'full' | null {
  if (display === 'off') return null
  return display === 'partial' ? 'partial' : 'full'
}

export type ReasoningUi = {
  display: ReasoningDisplay
  showReasoningTokens: boolean
  reasoningCollapsible: 'partial' | 'full'
}

/** Reasoning chrome flags for workflow output shells. */
export function reasoningUiForSkill(
  byId: Record<string, SkillSummary>,
  skillId: string
): ReasoningUi {
  const display = reasoningDisplayForSkill(byId, skillId)
  return {
    display,
    showReasoningTokens: display !== 'off',
    reasoningCollapsible: reasoningCollapsibleMode(display) ?? 'full'
  }
}

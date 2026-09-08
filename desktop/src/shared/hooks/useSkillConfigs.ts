import { useEffect, useState } from 'react'

import { isTraceMode, showsThinking, type SkillSummary, type TraceMode } from '@/shared/types/chat'

export type { SkillSummary }

function isSkillSummary(value: unknown): value is SkillSummary {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return typeof s.id === 'string' && typeof s.display === 'string' && isTraceMode(s.trace)
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

export function traceForSkill(byId: Record<string, SkillSummary>, skillId: string): TraceMode {
  return byId[skillId]?.trace ?? 'none'
}

/** Whether to capture structured thinking events for this skill (handles API load race). */
export function captureReasoningForSkill(
  byId: Record<string, SkillSummary>,
  skillId: string
): boolean {
  const trace = traceForSkill(byId, skillId)
  if (showsThinking(trace)) return true
  if (Object.keys(byId).length > 0) return false
  return skillId.startsWith('ticket.') || skillId.startsWith('about.')
}

function reasoningCollapsibleMode(trace: TraceMode): 'partial' | 'full' | null {
  if (!showsThinking(trace)) return null
  return trace === 'collapsed' ? 'partial' : 'full'
}

export type ReasoningUi = {
  display: TraceMode
  showReasoningTokens: boolean
  reasoningCollapsible: 'partial' | 'full'
}

/** Reasoning chrome flags for workflow output shells. */
export function reasoningUiForSkill(
  byId: Record<string, SkillSummary>,
  skillId: string
): ReasoningUi {
  const display = traceForSkill(byId, skillId)
  return {
    display,
    showReasoningTokens: showsThinking(display),
    reasoningCollapsible: reasoningCollapsibleMode(display) ?? 'full'
  }
}

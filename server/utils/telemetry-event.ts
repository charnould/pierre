export const CHAT_TELEMETRY_EVENT = 'ai.chat' as const

/**
 * Builds a workflow telemetry event from a skill id.
 * Convention: `ai.answer.<id_skill>` (see MEMORY.md).
 */
export function buildWorkflowTelemetryEvent(skillId: string): string {
  const id = skillId.trim()
  if (!id) throw new Error('skillId required')
  return `ai.answer.${id}`
}

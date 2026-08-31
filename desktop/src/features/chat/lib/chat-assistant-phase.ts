import type { ChatStatus } from '@/features/chat/lib/chat-session-types'

export type AssistantPhase = 'error' | 'stopped' | 'pending' | 'complete'

/** Maps stream status + message position to the assistant row render mode. */
export function resolveAssistantPhase(
  isLast: boolean,
  status: ChatStatus,
  hasContent: boolean
): AssistantPhase {
  if (!isLast) return 'complete'
  if (status === 'stopped') return 'stopped'
  if (status === 'error') return 'error'
  if (!hasContent && (status === 'submitted' || status === 'streaming')) return 'pending'
  return 'complete'
}

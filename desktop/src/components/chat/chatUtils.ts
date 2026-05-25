import type { ChatStatus } from '../../hooks/usePierreChat'

/** True while a request is in flight (submit ack or streaming). */
export function isChatGenerating(status: ChatStatus): boolean {
  return status === 'submitted' || status === 'streaming'
}

export type { ChatBoot, TraceMode } from '@pierre/shared/chat'
export { isTraceMode, showsThinking, showsTools } from '@pierre/shared/chat'

import type { TraceMode } from '@pierre/shared/chat'

export type SkillSummary = {
  id: string
  display: string
  trace: TraceMode
}

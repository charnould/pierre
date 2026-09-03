export type { ChatBoot, TraceMode } from '../../../../shared/chat'
export { isTraceMode, showsThinking, showsTools } from '../../../../shared/chat'

import type { TraceMode } from '../../../../shared/chat'

export type SkillSummary = {
  id: string
  display: string
  trace: TraceMode
}

import { WorkflowReasoningAmbient } from '@/features/workflow/components/WorkflowReasoningAmbient'
import { useWorkflowReasoningScroll } from '@/features/workflow/hooks/useWorkflowReasoningScroll'
import { ReasoningPlainContent } from '@/shared/components/reasoning/reasoning-plain-content'
export type WorkflowReasoningStreamProps = {
  reasoning: string
  isStreaming: boolean
}

export function WorkflowReasoningStream({ reasoning, isStreaming }: WorkflowReasoningStreamProps) {
  const { scrollRef } = useWorkflowReasoningScroll({ isStreaming, reasoning })

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkflowReasoningAmbient isLive={isStreaming} />
      <div
        ref={scrollRef}
        className="relative z-10 flex min-h-0 flex-1 [scrollbar-width:none] flex-col overflow-x-hidden overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
      >
        <ReasoningPlainContent embedded layout="flat" isStreaming={isStreaming}>
          {reasoning}
        </ReasoningPlainContent>
      </div>
    </div>
  )
}

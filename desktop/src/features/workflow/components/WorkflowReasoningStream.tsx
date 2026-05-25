import { ReasoningPlainContent } from '@/features/chat/components/ReasoningPlainContent'
import { WorkflowReasoningAmbient } from '@/features/workflow/components/WorkflowReasoningAmbient'
import { useWorkflowReasoningScroll } from '@/features/workflow/hooks/useWorkflowReasoningScroll'

export type WorkflowReasoningStreamProps = {
  reasoning: string
  isStreaming: boolean
}

export function WorkflowReasoningStream({ reasoning, isStreaming }: WorkflowReasoningStreamProps) {
  const { scrollRef } = useWorkflowReasoningScroll({ isStreaming, reasoning })

  return (
    <div className="workflow-reasoning-stream">
      <WorkflowReasoningAmbient isLive={isStreaming} />
      <div
        ref={scrollRef}
        className="workflow-artifact-body-scroll workflow-reflexion-stream-wrap relative z-10 min-h-0 flex-1"
      >
        <ReasoningPlainContent embedded layout="flat" isStreaming={isStreaming}>
          {reasoning}
        </ReasoningPlainContent>
      </div>
    </div>
  )
}

import { useState } from 'react'

import {
  workflowReasoningToggleDescription,
  workflowReasoningToggleLabel,
  workflowReasoningToggleMessage
} from '@/features/workflow/components/WorkflowPanelChrome'
import { Reasoning, ReasoningTrigger } from '@/shared/components/reasoning/reasoning'
import { ReasoningPlainContent } from '@/shared/components/reasoning/reasoning-plain-content'

export type WorkflowReasoningAccordionProps = {
  agentName: string
  show: boolean
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  deskScoped?: boolean
}

export function WorkflowReasoningAccordion({
  agentName,
  show,
  reasoning,
  isStreaming,
  isReasoningPhase,
  deskScoped = false
}: WorkflowReasoningAccordionProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const [wasReasoningPhase, setWasReasoningPhase] = useState(isReasoningPhase)
  if (wasReasoningPhase !== isReasoningPhase) {
    setWasReasoningPhase(isReasoningPhase)
    if (!isReasoningPhase) setManualOpen(false)
  }

  const hasReasoningContent = reasoning.trim().length > 0
  if (!show || !hasReasoningContent) return null

  const expanded = isReasoningPhase || manualOpen

  return (
    <Reasoning
      className="shrink-0"
      displayMode="full"
      open={expanded}
      onOpenChange={setManualOpen}
      isStreaming={isStreaming}
      isReasoningActive={isReasoningPhase}
      sealDuration={!isStreaming}
    >
      <ReasoningTrigger
        getThinkingMessage={(duration) =>
          deskScoped ? (
            <span className="flex min-w-0 flex-1 flex-col items-start text-start">
              <span>{workflowReasoningToggleLabel(agentName)}</span>
              <span>{workflowReasoningToggleDescription()}</span>
            </span>
          ) : (
            workflowReasoningToggleMessage(agentName, duration)
          )
        }
      />
      <ReasoningPlainContent
        layout={deskScoped ? 'desk' : 'boxed'}
        isStreaming={isStreaming && isReasoningPhase}
      >
        {reasoning}
      </ReasoningPlainContent>
    </Reasoning>
  )
}

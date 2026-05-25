import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Reasoning, ReasoningTrigger, useReasoning } from '@/features/chat/components/ai/reasoning'
import { ReasoningPlainContent } from '@/features/chat/components/ReasoningPlainContent'
import {
  workflowReasoningToggleDescription,
  workflowReasoningToggleLabel,
  workflowReasoningToggleMessage,
  WORKFLOW_REASONING_TOGGLE_CLASS
} from '@/features/workflow/components/WorkflowPanelChrome'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
import { cn } from '@/shared/lib/utils'

function WorkflowReasoningTrigger({
  agentName,
  deskScoped = false
}: {
  agentName: string
  deskScoped?: boolean
}) {
  const { isOpen, duration } = useReasoning()

  return (
    <ReasoningTrigger
      className={cn(
        'workflow-output-column__reasoning-trigger',
        deskScoped && 'desk-report-reasoning__trigger items-start'
      )}
    >
      {deskScoped ? (
        <div className={cn(FIELD_HEADING_GROUP, 'min-w-0 flex-1 text-left')}>
          <span className={cn(FIELD_HEADING, 'block')}>
            {workflowReasoningToggleLabel(agentName)}
          </span>
          <span className={cn(FIELD_CAPTION, 'block')}>{workflowReasoningToggleDescription()}</span>
        </div>
      ) : (
        <span
          className={cn(
            'workflow-output-column__reasoning-trigger-label inline-flex max-w-full min-w-0 items-baseline gap-1',
            WORKFLOW_REASONING_TOGGLE_CLASS
          )}
        >
          {workflowReasoningToggleMessage(agentName, duration)}
        </span>
      )}
      <span
        className={cn(
          'workflow-output-column__reasoning-trigger-chevron inline-flex shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          deskScoped && 'mt-0.5 ml-2 text-desk-label',
          !deskScoped && 'ml-auto',
          isOpen ? 'rotate-180' : 'rotate-0'
        )}
        aria-hidden
      >
        <ChevronDownIcon className="size-3" />
      </span>
    </ReasoningTrigger>
  )
}

function WorkflowReasoningAnimatedBody({
  reasoning,
  isStreaming,
  isReasoningPhase
}: {
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
}) {
  const { isOpen } = useReasoning()

  return (
    <div
      className={cn(
        'workflow-output-column__reasoning-panel workflow-reflexion-body',
        isOpen ? 'workflow-reflexion-body--expanded' : 'workflow-reflexion-body--collapsed'
      )}
    >
      <div className="workflow-reflexion-body-inner">
        <ReasoningPlainContent embedded isStreaming={isStreaming && isReasoningPhase}>
          {reasoning}
        </ReasoningPlainContent>
      </div>
    </div>
  )
}

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
  const hasReasoningContent = reasoning.trim().length > 0

  useEffect(() => {
    if (!isReasoningPhase) setManualOpen(false)
  }, [isReasoningPhase])

  if (!show || !hasReasoningContent) return null

  const expanded = isReasoningPhase || manualOpen

  return (
    <Reasoning
      className={cn(
        'workflow-output-column__reasoning-accordion workflow-reflexion-block shrink-0',
        deskScoped ? 'desk-report-reasoning' : 'mb-6'
      )}
      displayMode="full"
      open={expanded}
      onOpenChange={setManualOpen}
      isStreaming={isStreaming}
      isReasoningActive={isReasoningPhase}
      sealDuration={!isStreaming}
    >
      <WorkflowReasoningTrigger agentName={agentName} deskScoped={deskScoped} />
      <WorkflowReasoningAnimatedBody
        reasoning={reasoning}
        isStreaming={isStreaming}
        isReasoningPhase={isReasoningPhase}
      />
    </Reasoning>
  )
}

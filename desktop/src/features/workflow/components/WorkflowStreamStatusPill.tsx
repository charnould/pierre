import { workflowStreamStatusLabel } from '@/features/workflow/lib/workflow-stream-status'
import { Badge } from '@/shared/components/ui/badge'
import { Spinner } from '@/shared/components/ui/spinner'

export type WorkflowStreamStatusPillProps = {
  showReasoningTokens: boolean
  isReasoningPhase: boolean
  className?: string
}

export function WorkflowStreamStatusPill({
  showReasoningTokens,
  isReasoningPhase,
  className
}: WorkflowStreamStatusPillProps) {
  const label = workflowStreamStatusLabel({ showReasoningTokens, isReasoningPhase })

  return (
    <Badge variant="outline" className={className}>
      <Spinner data-icon="inline-start" aria-label={label} />
      {label}
    </Badge>
  )
}

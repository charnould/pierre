import { RepaymentMentionTextarea } from '@/features/repayment/components/RepaymentMentionTextarea'
import { WorkflowArtifactStreamPreview } from '@/features/workflow/components/WorkflowArtifactStreamPreview'
import { WorkflowReasoningAmbient } from '@/features/workflow/components/WorkflowReasoningAmbient'
import { useWorkflowReasoningScroll } from '@/features/workflow/hooks/useWorkflowReasoningScroll'
import { ReasoningPlainContent } from '@/shared/components/reasoning/reasoning-plain-content'
import { cn } from '@/shared/lib/utils'
export type TicketAiComposeFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
  className?: string
  disabled?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  reasoning?: string
  streamOutput?: string
  isStreaming?: boolean
  isReasoningPhase?: boolean
}

export function TicketAiComposeField({
  id,
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
  disabled = false,
  aiGenerating = false,
  showReasoning = false,
  reasoning = '',
  streamOutput = '',
  isStreaming = false,
  isReasoningPhase = false
}: TicketAiComposeFieldProps) {
  const inReasoningPhase = showReasoning && isReasoningPhase
  const showAiSurface = aiGenerating && isStreaming
  const fixedHeightClass = className?.includes('min-h-40')
    ? 'h-40'
    : className?.includes('min-h-32') || rows >= 6
      ? 'h-32'
      : 'h-28'
  const scrollContent = inReasoningPhase ? reasoning : `${reasoning}\n${streamOutput}`

  const { scrollRef } = useWorkflowReasoningScroll({
    isStreaming: showAiSurface,
    reasoning: scrollContent
  })

  if (showAiSurface) {
    return (
      <div
        className={cn(
          'border-border bg-muted shadow-xs relative overflow-hidden rounded-md border',
          fixedHeightClass,
          className
        )}
      >
        <WorkflowReasoningAmbient isLive={isStreaming} />
        <div
          ref={scrollRef}
          className="relative z-10 h-full overflow-y-auto overscroll-contain px-3 py-2"
        >
          {inReasoningPhase ? (
            <ReasoningPlainContent embedded layout="flat" isStreaming={isStreaming}>
              {reasoning}
            </ReasoningPlainContent>
          ) : (
            <div className="flex flex-col gap-2">
              {showReasoning && reasoning.trim() ? (
                <ReasoningPlainContent embedded layout="flat" isStreaming={false}>
                  {reasoning}
                </ReasoningPlainContent>
              ) : null}
              <WorkflowArtifactStreamPreview
                content={streamOutput}
                isStreaming={isStreaming}
                variant="output"
                className="text-foreground text-xs leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <RepaymentMentionTextarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn('[field-sizing:fixed] min-h-0 overflow-auto', fixedHeightClass, className)}
    />
  )
}

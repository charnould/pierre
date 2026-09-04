import { useEffect, useRef } from 'react'

import {
  AgentWorkTrace,
  GeneratedMarkdown,
  type AgentWorkPart
} from '@/shared/components/AgentWorkTrace'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
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
  workParts?: AgentWorkPart[]
  reasoningDuration?: number
  streamOutput?: string
  isStreaming?: boolean
  fillAvailable?: boolean
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
  workParts = [],
  reasoningDuration,
  streamOutput = '',
  isStreaming = false,
  fillAvailable = false
}: TicketAiComposeFieldProps) {
  const showAiSurface = aiGenerating && isStreaming
  const fixedHeightClass = fillAvailable
    ? 'h-full min-h-32'
    : className?.includes('min-h-40')
      ? 'h-40'
      : className?.includes('min-h-32') || rows >= 6
        ? 'h-32'
        : 'h-28'
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [streamOutput, workParts])

  if (showAiSurface) {
    return (
      <div
        className={cn(
          'border-border bg-background relative flex overflow-hidden rounded-md border',
          fixedHeightClass,
          className
        )}
      >
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3"
        >
          <AgentWorkTrace
            parts={workParts}
            display={showReasoning ? 'full' : 'off'}
            active={isStreaming}
            duration={reasoningDuration}
          />
          {streamOutput.trim() ? (
            <div className={cn(isStreaming && 'generated-stream-caret')}>
              <GeneratedMarkdown animated={isStreaming}>{streamOutput}</GeneratedMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <MentionTextarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn(
        '[field-sizing:fixed] min-h-0 overflow-auto',
        fixedHeightClass,
        fillAvailable && 'resize-none',
        className
      )}
    />
  )
}

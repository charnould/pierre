import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AboutDatastoreTables } from '@/features/about/components/AboutDatastoreTables'
import { ABOUT_OUTPUT_EMPTY } from '@/features/about/lib/about-form'
import { DockToolbar } from '@/features/workflow/components/DockToolbar'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { WorkflowOutputDock } from '@/features/workflow/components/WorkflowOutputDock'
import { WorkflowStreamStatusPill } from '@/features/workflow/components/WorkflowStreamStatusPill'
import {
  AgentWorkTrace,
  GeneratedMarkdown,
  type AgentWorkPart
} from '@/shared/components/AgentWorkTrace'
import { Docket } from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import type { ReasoningDisplay } from '@/shared/types'

export type AboutOutputPanelProps = {
  url?: string
  reasoningDisplay: ReasoningDisplay
  workParts: AgentWorkPart[]
  reasoningDuration?: number
  isStreaming: boolean
  isReasoningPhase: boolean
  hasOutput: boolean
  output: string
  title: string
  meta: string | null
  onCopy: (text: string, setCopied: (v: boolean) => void) => void | Promise<void>
}

export function AboutOutputPanel({
  url,
  reasoningDisplay,
  workParts,
  reasoningDuration,
  isStreaming,
  isReasoningPhase,
  hasOutput,
  output,
  title,
  meta,
  onCopy
}: AboutOutputPanelProps) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [copiedFor, setCopiedFor] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const showResponse = isStreaming || hasOutput || workParts.length > 0
  const showDock = showResponse
  const hasText = !!output.trim()
  const copied = copiedFor === output && hasText

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [output, workParts])

  const copyButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!hasText}
            aria-label={copied ? 'Copié' : 'Copier'}
            aria-pressed={copied || undefined}
            className={cn('text-foreground', copied && 'bg-foreground/10 text-foreground')}
            onClick={() =>
              void onCopy(output, (next) => {
                setCopiedFor(next ? output : null)
              })
            }
          />
        }
      >
        {copied ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Copié' : 'Copier'}</TooltipContent>
    </Tooltip>
  )

  const dock = (
    <DockToolbar className="h-full min-h-0 justify-end">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {isStreaming ? (
          <WorkflowStreamStatusPill
            showReasoningTokens={reasoningDisplay !== 'off'}
            isReasoningPhase={isReasoningPhase}
          />
        ) : null}
        {copyButton}
      </div>
    </DockToolbar>
  )

  return (
    <div className="bg-background flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!showResponse ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
            <Empty className="flex-none p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Docket />
                </EmptyMedia>
                <EmptyTitle>{ABOUT_OUTPUT_EMPTY.title}</EmptyTitle>
                <EmptyDescription>{ABOUT_OUTPUT_EMPTY.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
            <AboutDatastoreTables url={url} />
          </div>
        ) : (
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-sm leading-5 font-medium">{title}</h2>
              {meta ? <p className="pierre-meta tabular-nums">{meta}</p> : null}
            </div>
            <AgentWorkTrace
              parts={workParts}
              display={reasoningDisplay}
              active={isStreaming}
              duration={reasoningDuration}
            />
            {hasText ? (
              <div className={cn(isStreaming && 'generated-stream-caret')}>
                <GeneratedMarkdown animated={isStreaming}>{output}</GeneratedMarkdown>
              </div>
            ) : null}
          </div>
        )}

        <DockToolbarPortal slot={toolbarSlot}>{dock}</DockToolbarPortal>
      </div>

      {showDock ? (
        <div className="shrink-0 border-t px-4 py-2">
          <WorkflowOutputDock onSlotChange={setToolbarSlot} />
        </div>
      ) : null}
    </div>
  )
}

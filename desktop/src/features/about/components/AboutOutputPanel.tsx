import { Check, Copy } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { AboutDatastoreTables } from '@/features/about/components/AboutDatastoreTables'
import { ABOUT_OUTPUT_EMPTY } from '@/features/about/lib/about-form'
import { DockToolbar } from '@/features/workflow/components/DockToolbar'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { WorkflowArtifactStreamPreview } from '@/features/workflow/components/WorkflowArtifactStreamPreview'
import { WorkflowOutputDock } from '@/features/workflow/components/WorkflowOutputDock'
import { WorkflowReasoningAccordion } from '@/features/workflow/components/WorkflowReasoningAccordion'
import { WorkflowReasoningStream } from '@/features/workflow/components/WorkflowReasoningStream'
import { WorkflowStreamStatusPill } from '@/features/workflow/components/WorkflowStreamStatusPill'
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
import { parseProseMarkdown } from '@/shared/lib/markdown/parse-prose-markdown'
import { cn } from '@/shared/lib/utils'

export type AboutOutputPanelProps = {
  agentName: string
  url?: string
  showReasoningTokens: boolean
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  hasOutput: boolean
  output: string
  onCopy: (text: string, setCopied: (v: boolean) => void) => void | Promise<void>
}

export function AboutOutputPanel({
  agentName,
  url,
  showReasoningTokens,
  reasoning,
  isStreaming,
  isReasoningPhase,
  hasOutput,
  output,
  onCopy
}: AboutOutputPanelProps) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [copiedFor, setCopiedFor] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inReasoningPhase = showReasoningTokens && isReasoningPhase
  const showResponse = isStreaming || hasOutput
  const showDock = showResponse
  const hasText = !!output.trim()
  const copied = copiedFor === output && hasText

  const outputHtml = useMemo(
    () => (isStreaming ? '' : parseProseMarkdown(output)),
    [output, isStreaming]
  )

  const scrollOutputToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

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
            showReasoningTokens={showReasoningTokens}
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
          <div
            ref={inReasoningPhase ? undefined : scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          >
            {inReasoningPhase ? (
              <WorkflowReasoningStream reasoning={reasoning} isStreaming={isStreaming} />
            ) : (
              <>
                <WorkflowReasoningAccordion
                  agentName={agentName}
                  show={showReasoningTokens}
                  reasoning={reasoning}
                  isStreaming={isStreaming}
                  isReasoningPhase={isReasoningPhase}
                  deskScoped
                />
                {isStreaming ? (
                  <WorkflowArtifactStreamPreview
                    content={output}
                    isStreaming
                    variant="output"
                    onContentChange={scrollOutputToBottom}
                  />
                ) : hasText ? (
                  <div className="typeset" dangerouslySetInnerHTML={{ __html: outputHtml }} />
                ) : null}
              </>
            )}
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

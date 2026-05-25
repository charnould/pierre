import { Check, Copy, FileDown, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'

import { Reasoning, ReasoningTrigger } from '@/features/chat/components/ai/reasoning'
import { ReasoningPlainContent } from '@/features/chat/components/ReasoningPlainContent'
import {
  ActLink,
  resultEntrance,
  workflowThinkingMessage
} from '@/features/workflow/components/WorkflowPanelChrome'
import { cn } from '@/shared/lib/utils'

export type WorkflowOutputShellProps = {
  /** `legacy` keeps global Réflexion toolbar (About/Synthèse). `minimal` is a flex wrapper only. */
  layout?: 'legacy' | 'minimal'
  reasoningCollapsible: 'partial' | 'full'
  showReasoningTokens: boolean
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  hasOutputText?: boolean
  copiedR?: boolean
  onCopyResponse?: () => void
  onExportResponse?: () => void
  onRegenerate?: () => void
  compactToolbar?: boolean
  feedRef?: RefObject<HTMLDivElement | null>
  errMsg?: string
  children: ReactNode
}

export function WorkflowOutputShell({
  layout = 'legacy',
  reasoningCollapsible,
  showReasoningTokens,
  reasoning,
  isStreaming,
  isReasoningPhase,
  hasOutputText = false,
  copiedR = false,
  onCopyResponse,
  onExportResponse,
  onRegenerate,
  compactToolbar = false,
  feedRef,
  errMsg,
  children
}: WorkflowOutputShellProps) {
  if (layout === 'minimal') {
    return (
      <motion.div key="output" {...resultEntrance} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      key="output"
      {...resultEntrance}
      className="bg-background flex min-h-0 flex-1 flex-col"
    >
      <Reasoning
        className="mb-0 flex min-h-0 flex-1 flex-col"
        displayMode={reasoningCollapsible}
        isStreaming={showReasoningTokens && isStreaming}
        isReasoningActive={showReasoningTokens && isReasoningPhase}
        sealDuration={!isStreaming}
      >
        <div
          className={cn(
            'workflow-output-toolbar-wrap shrink-0 bg-background',
            compactToolbar && 'workflow-output-toolbar-wrap--compact'
          )}
        >
          <div className="workflow-output-toolbar">
            <ReasoningTrigger
              className="!w-auto min-w-0 flex-1"
              getThinkingMessage={workflowThinkingMessage}
            />
            <div className="flex h-8 shrink-0 items-center gap-1.5">
              {onCopyResponse ? (
                <ActLink
                  iconOnly
                  copied={copiedR}
                  disabled={!hasOutputText}
                  label={copiedR ? 'Copié' : 'Copier'}
                  icon={
                    copiedR ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />
                  }
                  onClick={onCopyResponse}
                />
              ) : null}
              {onExportResponse ? (
                <ActLink
                  iconOnly
                  disabled={!hasOutputText}
                  label="Exporter en Word"
                  icon={<FileDown className="h-3.5 w-3.5" />}
                  onClick={onExportResponse}
                />
              ) : null}
              {onRegenerate ? (
                <ActLink
                  iconOnly
                  disabled={isStreaming}
                  label="Regénérer"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={onRegenerate}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={feedRef}
          className="workflow-output-scroll bg-background flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
        >
          {showReasoningTokens && (isReasoningPhase || reasoning.length > 0) ? (
            <ReasoningPlainContent isStreaming={isStreaming && isReasoningPhase}>
              {reasoning}
            </ReasoningPlainContent>
          ) : null}

          {children}

          {errMsg ? <p className="text-destructive mt-4 text-sm">{errMsg}</p> : null}
        </div>
      </Reasoning>
    </motion.div>
  )
}

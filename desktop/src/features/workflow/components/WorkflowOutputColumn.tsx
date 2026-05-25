import { MailIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import {
  ArtifactInactiveDockToolbar,
  ArtifactMarkdownEditor
} from '@/features/workflow/components/ArtifactMarkdownEditor'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { WorkflowArtifactEmpty } from '@/features/workflow/components/WorkflowArtifactEmpty'
import { WorkflowOutputDock } from '@/features/workflow/components/WorkflowOutputDock'
import { WorkflowReasoningAccordion } from '@/features/workflow/components/WorkflowReasoningAccordion'
import { WorkflowReasoningStream } from '@/features/workflow/components/WorkflowReasoningStream'
import { CardFooter } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

export type WorkflowOutputColumnProps = {
  agentName: string
  showReasoningTokens: boolean
  reasoning: string
  isStreaming: boolean
  isReasoningPhase: boolean
  hasOutput: boolean
  output: string
  onOutputChange: (md: string) => void
  outputEditorKey: string
  outputToolbarActions?: ReactNode
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

export function WorkflowOutputColumn({
  agentName,
  showReasoningTokens,
  reasoning,
  isStreaming,
  isReasoningPhase,
  hasOutput,
  output,
  onOutputChange,
  outputEditorKey,
  outputToolbarActions,
  emptyIcon,
  emptyTitle,
  emptyDescription
}: WorkflowOutputColumnProps) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const inReasoningPhase = showReasoningTokens && isReasoningPhase
  const showResponse = isStreaming || hasOutput
  const showDock = showResponse

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <article
        className={cn(
          'workflow-output-column workflow-output-artifact min-h-0 flex-1',
          inReasoningPhase
            ? 'workflow-output-artifact--analyse'
            : 'workflow-output-artifact--reponse'
        )}
      >
        <div className="workflow-output-artifact-body">
          {inReasoningPhase ? (
            <WorkflowReasoningStream reasoning={reasoning} isStreaming={isStreaming} />
          ) : !showResponse ? (
            <WorkflowArtifactEmpty
              icon={emptyIcon ?? <MailIcon />}
              title={emptyTitle ?? 'Aucune réponse'}
              description={
                emptyDescription ?? 'Complétez le formulaire à gauche, puis générez un brouillon.'
              }
            />
          ) : (
            <div className="workflow-output-column__response">
              <ArtifactMarkdownEditor
                key={outputEditorKey}
                variant="output"
                content={output}
                onChange={onOutputChange}
                isStreaming={isStreaming}
                actions={outputToolbarActions}
                toolbarSlot={toolbarSlot}
                liveMarkdownWhileStreaming
                leadingContent={
                  <WorkflowReasoningAccordion
                    agentName={agentName}
                    show={showReasoningTokens}
                    reasoning={reasoning}
                    isStreaming={isStreaming}
                    isReasoningPhase={isReasoningPhase}
                  />
                }
              />
            </div>
          )}
        </div>

        {inReasoningPhase ? (
          <DockToolbarPortal slot={toolbarSlot}>
            <ArtifactInactiveDockToolbar actions={outputToolbarActions} />
          </DockToolbarPortal>
        ) : null}
      </article>

      {showDock ? (
        <CardFooter className="min-h-14 shrink-0 justify-start border-t">
          <WorkflowOutputDock onSlotChange={setToolbarSlot} />
        </CardFooter>
      ) : null}
    </div>
  )
}

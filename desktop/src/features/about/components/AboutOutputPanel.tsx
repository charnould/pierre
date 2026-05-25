import { ScrollText } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { ABOUT_OUTPUT_EMPTY } from '@/features/about/lib/about-form'
import {
  ArtifactInactiveDockToolbar,
  ArtifactMarkdownEditor
} from '@/features/workflow/components/ArtifactMarkdownEditor'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { WorkflowOutputDock } from '@/features/workflow/components/WorkflowOutputDock'
import { WorkflowReasoningAccordion } from '@/features/workflow/components/WorkflowReasoningAccordion'
import { WorkflowReasoningStream } from '@/features/workflow/components/WorkflowReasoningStream'
import { WorkflowStreamStatusPill } from '@/features/workflow/components/WorkflowStreamStatusPill'
import { Card, CardBody, CardFooter } from '@/shared/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { cn } from '@/shared/lib/utils'

export type AboutOutputPanelProps = {
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
}

export function AboutOutputPanel({
  agentName,
  showReasoningTokens,
  reasoning,
  isStreaming,
  isReasoningPhase,
  hasOutput,
  output,
  onOutputChange,
  outputEditorKey,
  outputToolbarActions
}: AboutOutputPanelProps) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const inReasoningPhase = showReasoningTokens && isReasoningPhase
  const showResponse = isStreaming || hasOutput
  const showDock = showResponse
  const dockLead = isStreaming ? (
    <WorkflowStreamStatusPill
      showReasoningTokens={showReasoningTokens}
      isReasoningPhase={isReasoningPhase}
    />
  ) : null

  return (
    <div className="desk-output-panel">
      <Card variant="report">
        <CardBody inset="report">
          {!showResponse ? (
            <Empty className="desk-output-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollText />
                </EmptyMedia>
                <EmptyTitle>{ABOUT_OUTPUT_EMPTY.title}</EmptyTitle>
                <EmptyDescription>{ABOUT_OUTPUT_EMPTY.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
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
                      deskDock
                      dockLead={dockLead}
                      leadingContent={
                        <WorkflowReasoningAccordion
                          agentName={agentName}
                          show={showReasoningTokens}
                          reasoning={reasoning}
                          isStreaming={isStreaming}
                          isReasoningPhase={isReasoningPhase}
                          deskScoped
                        />
                      }
                    />
                  </div>
                )}
              </div>

              {inReasoningPhase ? (
                <DockToolbarPortal slot={toolbarSlot}>
                  <ArtifactInactiveDockToolbar
                    actions={outputToolbarActions}
                    dockLead={dockLead}
                    deskLayout
                  />
                </DockToolbarPortal>
              ) : null}
            </article>
          )}
        </CardBody>

        {showDock ? (
          <CardFooter inset="report" className="desk-output-footer">
            <WorkflowOutputDock onSlotChange={setToolbarSlot} />
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}

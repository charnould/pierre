import { MailIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import type { DraftRevision } from '@/features/tickets/lib/ticket-draft-revision'
import {
  ArtifactInactiveDockToolbar,
  ArtifactMarkdownEditor
} from '@/features/workflow/components/ArtifactMarkdownEditor'
import { DockToolbarPortal } from '@/features/workflow/components/DockToolbarPortal'
import { DraftRevisionToggle } from '@/features/workflow/components/DraftRevisionToggle'
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

const TICKET_OUTPUT_EMPTY = {
  title: 'Aucune réponse',
  description: 'Complétez le formulaire à gauche, puis générez un brouillon.'
} as const

export type TicketOutputPanelProps = {
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
  draftRevision?: DraftRevision
  showDraftRevisionToggle?: boolean
  onDraftRevisionChange?: (revision: DraftRevision) => void
  onRequestEdit?: () => void
  isAutomationGenerated?: boolean
}

export function TicketOutputPanel({
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
  draftRevision = 'generated',
  showDraftRevisionToggle = false,
  onDraftRevisionChange,
  onRequestEdit,
  isAutomationGenerated = false
}: TicketOutputPanelProps) {
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const inReasoningPhase = showReasoningTokens && isReasoningPhase
  const showResponse = isStreaming || hasOutput
  const showDock = showResponse
  const outputReadOnly = showDraftRevisionToggle && draftRevision === 'generated' && !isStreaming
  const dockMeta = isStreaming ? (
    <WorkflowStreamStatusPill
      showReasoningTokens={showReasoningTokens}
      isReasoningPhase={isReasoningPhase}
    />
  ) : showDraftRevisionToggle ? (
    <DraftRevisionToggle
      draftRevision={draftRevision}
      onDraftRevisionChange={onDraftRevisionChange}
      isAutomationGenerated={isAutomationGenerated}
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
                  <MailIcon />
                </EmptyMedia>
                <EmptyTitle>{TICKET_OUTPUT_EMPTY.title}</EmptyTitle>
                <EmptyDescription>{TICKET_OUTPUT_EMPTY.description}</EmptyDescription>
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
                      readOnly={outputReadOnly}
                      onRequestEdit={onRequestEdit}
                      deskDock
                      dockLead={dockMeta}
                      hideFormatToolbar={outputReadOnly}
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
                    dockLead={dockMeta}
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

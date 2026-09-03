import { useId } from 'react'

import type { AgentWorkPart } from '@/shared/components/AgentWorkTrace'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'

import { TicketAiComposeField } from './TicketAiComposeField'

interface Props {
  content: string
  onContentChange: (value: string) => void
  aiBusy?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  workParts?: AgentWorkPart[]
  reasoningDuration?: number
  streamOutput?: string
  isStreaming?: boolean
  onSave: () => void
  onCancel: () => void
  showConnector: boolean
  embedded?: boolean
  saving?: boolean
}

export function TicketTimelineSummarizeDraft({
  content,
  onContentChange,
  aiBusy,
  aiGenerating,
  showReasoning,
  workParts,
  reasoningDuration,
  streamOutput,
  isStreaming,
  onSave,
  onCancel,
  showConnector: _showConnector,
  embedded: _embedded = false,
  saving = false
}: Props) {
  const contentId = useId()
  const canSave = Boolean(content.trim())
  const busy = Boolean(aiBusy || saving)

  return (
    <>
      <InspectorComposeField htmlFor={contentId} label="Point de situation">
        <TicketAiComposeField
          id={contentId}
          value={content}
          onChange={onContentChange}
          placeholder="Le point de situation apparaîtra ici…"
          rows={8}
          className="min-h-40"
          disabled={busy}
          aiGenerating={aiGenerating}
          showReasoning={showReasoning}
          workParts={workParts}
          reasoningDuration={reasoningDuration}
          streamOutput={streamOutput}
          isStreaming={isStreaming}
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={busy} extra={null}>
        <Button type="button" size="sm" disabled={!canSave || busy} onClick={onSave}>
          Enregistrer
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

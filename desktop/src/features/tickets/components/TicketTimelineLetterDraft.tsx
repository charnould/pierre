import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { Input } from '@/shared/components/ui/input'

import { TicketAiComposeField } from './TicketAiComposeField'
import { TicketOutboundMessageActions } from './TicketOutboundMessageActions'

interface Props {
  subject: string
  onSubjectChange: (value: string) => void
  body: string
  onBodyChange: (value: string) => void
  aiBusy?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  reasoning?: string
  streamOutput?: string
  isStreaming?: boolean
  isReasoningPhase?: boolean
  onDraft: () => void
  onSaveDraft: () => void
  onExportWord: () => void
  onMarkSent: () => void
  onCancel: () => void
  showConnector: boolean
  embedded?: boolean
  saving?: boolean
}

export function TicketTimelineLetterDraft({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  aiBusy,
  aiGenerating,
  showReasoning,
  reasoning,
  streamOutput,
  isStreaming,
  isReasoningPhase,
  onDraft,
  onSaveDraft,
  onExportWord,
  onMarkSent,
  onCancel,
  showConnector: _showConnector,
  embedded: _embedded = false,
  saving = false
}: Props) {
  const subjectId = useId()
  const messageId = useId()
  const canSend = Boolean(body.trim())
  const busy = Boolean(aiBusy || saving)

  return (
    <>
      <InspectorComposeField htmlFor={subjectId} label="Objet">
        <Input
          id={subjectId}
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          placeholder="Objet du courrier"
          disabled={busy}
        />
      </InspectorComposeField>
      <InspectorComposeField htmlFor={messageId} label="Message">
        <TicketAiComposeField
          id={messageId}
          value={body}
          onChange={onBodyChange}
          placeholder="Rédigez votre courrier…"
          rows={6}
          className="min-h-32"
          disabled={busy}
          aiGenerating={aiGenerating}
          showReasoning={showReasoning}
          reasoning={reasoning}
          streamOutput={streamOutput}
          isStreaming={isStreaming}
          isReasoningPhase={isReasoningPhase}
        />
      </InspectorComposeField>
      <TicketOutboundMessageActions
        variant="letter"
        canSend={canSend}
        aiBusy={busy}
        onDraft={onDraft}
        onSaveDraft={onSaveDraft}
        onExportWord={onExportWord}
        onMarkSent={onMarkSent}
        onCancel={onCancel}
      />
    </>
  )
}

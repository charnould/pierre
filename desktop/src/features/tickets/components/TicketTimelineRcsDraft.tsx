import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'

import { TicketAiComposeField } from './TicketAiComposeField'
import { TicketOutboundMessageActions } from './TicketOutboundMessageActions'

interface Props {
  message: string
  onMessageChange: (value: string) => void
  aiBusy?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  reasoning?: string
  streamOutput?: string
  isStreaming?: boolean
  isReasoningPhase?: boolean
  onDraft: () => void
  onSaveDraft: () => void
  onSend: () => void
  onCancel: () => void
  showConnector: boolean
  embedded?: boolean
  saving?: boolean
}

export function TicketTimelineRcsDraft({
  message,
  onMessageChange,
  aiBusy,
  aiGenerating,
  showReasoning,
  reasoning,
  streamOutput,
  isStreaming,
  isReasoningPhase,
  onDraft,
  onSaveDraft,
  onSend,
  onCancel,
  showConnector: _showConnector,
  embedded: _embedded = false,
  saving = false
}: Props) {
  const messageId = useId()
  const canSend = Boolean(message.trim())
  const busy = Boolean(aiBusy || saving)

  return (
    <>
      <InspectorComposeField htmlFor={messageId} label="Message">
        <TicketAiComposeField
          id={messageId}
          value={message}
          onChange={onMessageChange}
          placeholder="Rédigez votre RCS…"
          rows={5}
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
        variant="rcs"
        canSend={canSend}
        aiBusy={busy}
        onDraft={onDraft}
        onSaveDraft={onSaveDraft}
        onSend={onSend}
        onCancel={onCancel}
      />
    </>
  )
}

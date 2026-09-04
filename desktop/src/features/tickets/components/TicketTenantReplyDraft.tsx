import { useId, useMemo } from 'react'

import type { AgentWorkPart } from '@/shared/components/AgentWorkTrace'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { SelectItems } from '@/shared/components/SelectItems'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import type { TicketExternalApplication } from '../lib/ticket-external-application'
import { TicketAiComposeField } from './TicketAiComposeField'
import { TicketOutboundMessageActions } from './TicketOutboundMessageActions'

export type TicketReplyFormat = 'rcs' | 'email' | 'letter' | 'external'

const DIRECT_FORMAT_ITEMS = [
  { value: 'rcs', label: 'SMS / RCS' },
  { value: 'email', label: 'Courriel' },
  { value: 'letter', label: 'Via la poste' }
] satisfies { value: TicketReplyFormat; label: string }[]

interface Props {
  format: TicketReplyFormat
  onFormatChange: (format: TicketReplyFormat) => void
  externalApplication: TicketExternalApplication | null
  subject: string
  onSubjectChange: (value: string) => void
  message: string
  onMessageChange: (value: string) => void
  aiBusy?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  workParts?: AgentWorkPart[]
  reasoningDuration?: number
  streamOutput?: string
  isStreaming?: boolean
  saving?: boolean
  onGenerate: () => void
  onInject: () => void
  onSend?: () => void
  onExportDocx?: () => void
  onCancel: () => void
}

export function TicketTenantReplyDraft({
  format,
  onFormatChange,
  externalApplication,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  aiBusy,
  aiGenerating,
  showReasoning,
  workParts,
  reasoningDuration,
  streamOutput,
  isStreaming,
  saving = false,
  onGenerate,
  onInject,
  onSend,
  onExportDocx,
  onCancel
}: Props) {
  const formatId = useId()
  const subjectId = useId()
  const messageId = useId()
  const busy = Boolean(aiBusy || saving)
  const variant = format === 'external' ? 'email' : format
  const formatItems = useMemo(
    () =>
      externalApplication
        ? [
            { value: 'external' as const, label: `Via ${externalApplication.name}` },
            ...DIRECT_FORMAT_ITEMS
          ]
        : DIRECT_FORMAT_ITEMS,
    [externalApplication]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <InspectorComposeField htmlFor={formatId} label="Format">
        <Select
          items={formatItems}
          value={format}
          disabled={busy}
          onValueChange={(value) => {
            if (
              value === 'rcs' ||
              value === 'email' ||
              value === 'letter' ||
              (value === 'external' && externalApplication)
            ) {
              onFormatChange(value)
            }
          }}
        >
          <SelectTrigger id={formatId} className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItems items={formatItems} />
          </SelectContent>
        </Select>
      </InspectorComposeField>

      {variant !== 'rcs' ? (
        <InspectorComposeField htmlFor={subjectId} label="Objet">
          <Input
            id={subjectId}
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={variant === 'email' ? 'Objet du courriel' : 'Objet du courrier'}
            disabled={busy}
          />
        </InspectorComposeField>
      ) : null}

      <InspectorComposeField
        htmlFor={messageId}
        label="Message"
        className="min-h-0 flex-1"
        contentClassName="min-h-0 flex-1"
      >
        <TicketAiComposeField
          id={messageId}
          value={message}
          onChange={onMessageChange}
          placeholder={
            variant === 'rcs'
              ? 'Rédigez votre SMS ou RCS…'
              : variant === 'email'
                ? 'Rédigez votre courriel…'
                : 'Rédigez votre courrier…'
          }
          rows={variant === 'rcs' ? 5 : 6}
          fillAvailable
          disabled={busy}
          aiGenerating={aiGenerating}
          showReasoning={showReasoning}
          workParts={workParts}
          reasoningDuration={reasoningDuration}
          streamOutput={streamOutput}
          isStreaming={isStreaming}
        />
      </InspectorComposeField>

      <TicketOutboundMessageActions
        variant={variant}
        canSend={Boolean(message.trim())}
        externalApplicationName={format === 'external' ? externalApplication?.name : undefined}
        aiBusy={busy}
        onGenerate={onGenerate}
        onInject={onInject}
        onSend={onSend}
        onExportDocx={onExportDocx}
        onCancel={onCancel}
      />
    </div>
  )
}

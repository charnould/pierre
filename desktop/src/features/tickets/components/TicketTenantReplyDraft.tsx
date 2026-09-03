import { useId, useMemo } from 'react'

import type { AgentWorkPart } from '@/shared/components/AgentWorkTrace'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorRcsFieldset } from '@/shared/components/inspector/inspector-rcs-compose-fields'
import { SelectItems } from '@/shared/components/SelectItems'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { ExternalApplication } from '@/shared/lib/external-application'

import { rcs_compose_ready, type RcsComposeValue } from '../../../../../shared/rcs-message'
import { TicketAiComposeField } from './TicketAiComposeField'
import { TicketOutboundMessageActions } from './TicketOutboundMessageActions'

export type TicketReplyFormat = 'rcs' | 'email' | 'letter' | 'external'

const DIRECT_FORMAT_ITEMS = [
  { value: 'rcs', label: 'SMS / RCS' },
  { value: 'email', label: 'Courriel' },
  { value: 'letter', label: 'Via la poste' }
] satisfies { value: TicketReplyFormat; label: string }[]

type TicketReplyDraftShared = {
  onFormatChange: (format: TicketReplyFormat) => void
  externalApplication: ExternalApplication | null
  aiBusy?: boolean
  aiGenerating?: boolean
  showReasoning?: boolean
  workParts?: AgentWorkPart[]
  reasoningDuration?: number
  streamOutput?: string
  isStreaming?: boolean
  saving?: boolean
  onSend?: () => void
  onCancel: () => void
}

export type TicketTenantReplyDraftProps =
  | (TicketReplyDraftShared & {
      format: 'rcs'
      rcsCompose: RcsComposeValue
      onRcsComposeChange: (value: RcsComposeValue) => void
    })
  | (TicketReplyDraftShared & {
      format: Exclude<TicketReplyFormat, 'rcs'>
      subject: string
      onSubjectChange: (value: string) => void
      message: string
      onMessageChange: (value: string) => void
      onInject: () => void
      onExportDocx?: () => void
    })

export function TicketTenantReplyDraft(props: TicketTenantReplyDraftProps) {
  const {
    format,
    onFormatChange,
    externalApplication,
    aiBusy,
    aiGenerating,
    showReasoning,
    workParts,
    reasoningDuration,
    streamOutput,
    isStreaming,
    saving = false,
    onSend,
    onCancel
  } = props
  const formatId = useId()
  const subjectId = useId()
  const messageId = useId()
  const busy = Boolean(aiBusy || saving)
  const formatItems = useMemo(
    () =>
      externalApplication
        ? [{ value: 'external' as const, label: externalApplication.name }, ...DIRECT_FORMAT_ITEMS]
        : DIRECT_FORMAT_ITEMS,
    [externalApplication]
  )
  const aiField = {
    aiGenerating,
    showReasoning,
    workParts,
    reasoningDuration,
    streamOutput,
    isStreaming
  }

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

      {props.format === 'rcs' ? (
        <>
          <InspectorRcsFieldset
            value={props.rcsCompose}
            onChange={props.onRcsComposeChange}
            disabled={busy}
            bodyId={messageId}
            fillBody
            body={
              <TicketAiComposeField
                id={messageId}
                value={props.rcsCompose.body}
                onChange={(body) => props.onRcsComposeChange({ ...props.rcsCompose, body })}
                placeholder="Rédigez votre RCS…"
                rows={5}
                fillAvailable
                disabled={busy}
                {...aiField}
              />
            }
          />
          <TicketOutboundMessageActions
            variant="rcs"
            canSend={rcs_compose_ready(props.rcsCompose)}
            aiBusy={busy}
            onSend={onSend}
            onCancel={onCancel}
          />
        </>
      ) : (
        <>
          {format === 'email' || format === 'letter' ? (
            <InspectorComposeField htmlFor={subjectId} label="Objet">
              <Input
                id={subjectId}
                value={props.subject}
                onChange={(event) => props.onSubjectChange(event.target.value)}
                placeholder={format === 'email' ? 'Objet du courriel' : 'Objet du courrier'}
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
              value={props.message}
              onChange={props.onMessageChange}
              placeholder={
                format === 'email' || format === 'external'
                  ? 'Rédigez votre courriel…'
                  : 'Rédigez votre courrier…'
              }
              rows={6}
              fillAvailable
              disabled={busy}
              {...aiField}
            />
          </InspectorComposeField>

          <TicketOutboundMessageActions
            variant={format === 'external' ? 'email' : format}
            canSend={Boolean(props.message.trim())}
            externalApplicationName={format === 'external' ? externalApplication?.name : undefined}
            aiBusy={busy}
            onInject={props.onInject}
            onSend={onSend}
            onExportDocx={props.onExportDocx}
            onCancel={onCancel}
          />
        </>
      )}
    </div>
  )
}

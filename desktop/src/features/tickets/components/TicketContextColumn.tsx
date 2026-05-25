import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { FileChips } from '@/features/workflow/components/FileChips'
import type { FileEntry } from '@/features/workflow/components/WorkflowPanelChrome'
import { Card, CardBody, CardFooter } from '@/shared/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'

interface Props {
  agentName: string
  ticketNumber: string
  onTicketNumberChange: (value: string) => void
  onTicketNumberBlur?: () => void
  tenantNumber: string
  onTenantNumberChange: (value: string) => void
  message: string
  onMessageChange: (value: string) => void
  context: string
  onContextChange: (value: string) => void
  files: FileEntry[]
  onRemoveFile: (index: number) => void
  formatPicker: ReactNode
  primaryAction: ReactNode
  errMsg: string | null
}

function TicketField({
  id,
  label,
  description,
  className,
  children
}: {
  id?: string
  label: string
  description?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Field className={className}>
      <div className={FIELD_HEADING_GROUP}>
        <FieldLabel htmlFor={id} className={FIELD_HEADING}>
          {label}
        </FieldLabel>
        {description ? (
          <FieldDescription className={FIELD_CAPTION}>{description}</FieldDescription>
        ) : null}
      </div>
      {children}
    </Field>
  )
}

export function TicketContextColumn({
  agentName,
  ticketNumber,
  onTicketNumberChange,
  onTicketNumberBlur,
  tenantNumber,
  onTenantNumberChange,
  message,
  onMessageChange,
  context,
  onContextChange,
  files,
  onRemoveFile,
  formatPicker,
  primaryAction,
  errMsg
}: Props) {
  const ticketNumberFieldId = useId()
  const tenantFieldId = useId()
  const messageFieldId = useId()
  const contextFieldId = useId()
  const [complementsOpen, setComplementsOpen] = useState(
    () => context.trim().length > 0 || files.length > 0
  )

  return (
    <div className="desk-form-panel">
      <Card variant="chrome">
        <CardBody inset="chrome" className="workflow-context-form desk-pane-scroll">
          <FieldGroup className="shrink-0">
            <div className="workflow-context-id-grid">
              <TicketField
                id={ticketNumberFieldId}
                label="Affaire"
                description="Identifiant interne"
              >
                <Input
                  id={ticketNumberFieldId}
                  type="text"
                  variant="desk"
                  value={ticketNumber}
                  onChange={(e) => onTicketNumberChange(e.target.value)}
                  onBlur={onTicketNumberBlur}
                  placeholder="REQ-2024-00142"
                />
              </TicketField>
              <TicketField id={tenantFieldId} label="Locataire" description="Identifiant interne">
                <Input
                  id={tenantFieldId}
                  type="text"
                  inputMode="numeric"
                  variant="desk"
                  value={tenantNumber}
                  onChange={(e) => onTenantNumberChange(e.target.value)}
                  placeholder="187329"
                />
              </TicketField>
            </div>
          </FieldGroup>

          <div className="workflow-context-fields">
            <TicketField
              id={messageFieldId}
              label="Message"
              description="Message adressé ou la demande formulée par le locataire"
              className="workflow-context-field-grow"
            >
              <Textarea
                id={messageFieldId}
                variant="desk"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="workflow-context-textarea-grow"
              />
            </TicketField>

            <Collapsible open={complementsOpen} onOpenChange={setComplementsOpen}>
              <Field>
                <CollapsibleTrigger>
                  <span id={contextFieldId} className={FIELD_HEADING}>
                    Contexte additionnel
                  </span>
                  <ChevronDown aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <FieldDescription className={FIELD_CAPTION}>
                    Optionnel · Historique ou toutes précisions utiles pour permettre à {agentName}{' '}
                    de générer une réponse pertinente
                  </FieldDescription>
                  <Textarea
                    variant="desk"
                    aria-labelledby={contextFieldId}
                    value={context}
                    onChange={(e) => onContextChange(e.target.value)}
                    rows={3}
                  />
                  <FileChips files={files} onRemove={onRemoveFile} />
                </CollapsibleContent>
              </Field>
            </Collapsible>
          </div>

          {formatPicker}

          {errMsg ? <p className="workflow-context-error">{errMsg}</p> : null}
        </CardBody>

        <CardFooter inset="chrome">{primaryAction}</CardFooter>
      </Card>
    </div>
  )
}

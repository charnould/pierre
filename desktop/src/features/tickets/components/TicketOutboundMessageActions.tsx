import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'

type Variant = 'rcs' | 'email' | 'letter'

interface Props {
  variant: Variant
  canSend: boolean
  externalApplicationName?: string
  aiBusy?: boolean
  onGenerate: () => void
  onInject: () => void
  onSend?: () => void
  onExportDocx?: () => void
  onCancel: () => void
}

export function TicketOutboundMessageActions({
  variant,
  canSend,
  externalApplicationName,
  aiBusy = false,
  onGenerate,
  onInject,
  onSend,
  onExportDocx,
  onCancel
}: Props) {
  const agent = useAgentIdentity()

  return (
    <InspectorComposeFooter
      onCancel={onCancel}
      pending={aiBusy}
      extra={
        <>
          <Button type="button" variant="outline" size="sm" disabled={aiBusy} onClick={onGenerate}>
            Rédiger avec {agent.name}
          </Button>
          {!externalApplicationName && variant === 'letter' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSend || aiBusy}
              onClick={onExportDocx}
            >
              Exporter en DOCX
            </Button>
          ) : null}
        </>
      }
    >
      {externalApplicationName ? (
        <Button type="button" size="sm" disabled={!canSend || aiBusy} onClick={onInject}>
          Injecter dans {externalApplicationName}
        </Button>
      ) : (
        <Button type="button" size="sm" disabled={!canSend || aiBusy} onClick={onSend}>
          Envoyer
        </Button>
      )}
    </InspectorComposeFooter>
  )
}

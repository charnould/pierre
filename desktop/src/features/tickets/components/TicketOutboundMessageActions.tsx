import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'

type Variant = 'rcs' | 'email' | 'letter'

interface Props {
  variant: Variant
  canSend: boolean
  externalApplicationName?: string
  aiBusy?: boolean
  onInject?: () => void
  onSend?: () => void
  onExportDocx?: () => void
  onCancel: () => void
}

export function TicketOutboundMessageActions({
  variant,
  canSend,
  externalApplicationName,
  aiBusy = false,
  onInject,
  onSend,
  onExportDocx,
  onCancel
}: Props) {
  return (
    <InspectorComposeFooter
      onCancel={onCancel}
      pending={aiBusy}
      extra={
        <>
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
          {externalApplicationName}
        </Button>
      ) : (
        <Button type="button" size="sm" disabled={!canSend || aiBusy} onClick={onSend}>
          Envoyer
        </Button>
      )}
    </InspectorComposeFooter>
  )
}

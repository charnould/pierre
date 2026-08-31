import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'

type Variant = 'rcs' | 'email' | 'letter'

interface Props {
  variant: Variant
  canSend: boolean
  aiBusy?: boolean
  onDraft: () => void
  onSaveDraft: () => void
  onSend?: () => void
  onExportWord?: () => void
  onMarkSent?: () => void
  onCancel: () => void
}

export function TicketOutboundMessageActions({
  variant,
  canSend,
  aiBusy = false,
  onDraft,
  onSaveDraft,
  onSend,
  onExportWord,
  onMarkSent,
  onCancel
}: Props) {
  return (
    <InspectorComposeFooter
      onCancel={onCancel}
      pending={aiBusy}
      extra={
        <>
          <Button type="button" variant="outline" size="sm" disabled={aiBusy} onClick={onDraft}>
            Rédiger avec IA
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={aiBusy} onClick={onSaveDraft}>
            Sauvegarder
          </Button>
        </>
      }
    >
      {variant === 'letter' ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canSend || aiBusy}
            onClick={onExportWord}
          >
            Exporter au format Word
          </Button>
          <Button type="button" size="sm" disabled={!canSend || aiBusy} onClick={onMarkSent}>
            Marquer comme envoyé
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" disabled={!canSend || aiBusy} onClick={onSend}>
          {variant === 'rcs' ? 'Envoyer le RCS' : 'Envoyer au locataire'}
        </Button>
      )}
    </InspectorComposeFooter>
  )
}

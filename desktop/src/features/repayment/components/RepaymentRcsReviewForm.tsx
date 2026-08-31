import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'

interface Props {
  message: string
  onMessageChange: (message: string) => void
  onCancel: () => void
  onSend: () => void
  sending?: boolean
}

export function RepaymentRcsReviewForm({
  message,
  onMessageChange,
  onCancel,
  onSend,
  sending = false
}: Props) {
  const messageId = useId()
  const canSend = Boolean(message.trim())

  return (
    <>
      <InspectorComposeField htmlFor={messageId} label="Message">
        <Textarea
          id={messageId}
          value={message}
          disabled={sending}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Rédigez votre RCS…"
          rows={6}
          className="min-h-32 resize-none"
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={sending}>
        <Button type="button" size="sm" disabled={!canSend || sending} onClick={onSend}>
          Envoyer
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

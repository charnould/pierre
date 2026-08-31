import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'

interface Props {
  subject: string
  onSubjectChange: (subject: string) => void
  message: string
  onMessageChange: (message: string) => void
  onCancel: () => void
  onSend: () => void
  sending?: boolean
}

export function RepaymentEmailReviewForm({
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  onCancel,
  onSend,
  sending = false
}: Props) {
  const subjectId = useId()
  const messageId = useId()
  const canSend = Boolean(message.trim())

  return (
    <>
      <InspectorComposeField htmlFor={subjectId} label="Objet">
        <Input
          id={subjectId}
          value={subject}
          disabled={sending}
          onChange={(event) => onSubjectChange(event.target.value)}
          placeholder="Objet du courriel"
        />
      </InspectorComposeField>
      <InspectorComposeField htmlFor={messageId} label="Message">
        <Textarea
          id={messageId}
          value={message}
          disabled={sending}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Rédigez votre courriel…"
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

import { useId } from 'react'

import { RepaymentMentionTextarea } from '@/features/repayment/components/RepaymentMentionTextarea'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'

interface Props {
  comment: string
  onCommentChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
  showConnector: boolean
  embedded?: boolean
  saving?: boolean
}

export function TicketTimelineCommentDraft({
  comment,
  onCommentChange,
  onCancel,
  onSave,
  showConnector: _showConnector,
  embedded: _embedded = false,
  saving = false
}: Props) {
  const noteId = useId()

  return (
    <>
      <InspectorComposeField htmlFor={noteId} label="Note">
        <RepaymentMentionTextarea
          id={noteId}
          value={comment}
          onChange={onCommentChange}
          placeholder="Votre note… Tapez @ pour mentionner un collègue"
          rows={4}
          className="min-h-24"
          disabled={saving}
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={saving}>
        <Button type="button" size="sm" disabled={!comment.trim() || saving} onClick={onSave}>
          Enregistrer
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

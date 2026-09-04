import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { Button } from '@/shared/components/ui/button'

interface Props {
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onSave: (comment?: string) => void
  saveLabel?: string
  placeholder?: string
  saving?: boolean
}

export function RepaymentInlineNoteForm({
  value,
  onChange,
  onCancel,
  onSave,
  saveLabel = 'Enregistrer',
  placeholder = 'Ajouter une note… Tapez @ pour mentionner un collègue',
  saving = false
}: Props) {
  const noteId = useId()

  return (
    <>
      <InspectorComposeField htmlFor={noteId} label="Note">
        <MentionTextarea
          id={noteId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={saving}
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={saving}>
        <Button
          type="button"
          size="sm"
          disabled={!value.trim() || saving}
          onClick={() => onSave(value)}
        >
          {saveLabel}
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

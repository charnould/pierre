import { useId, useState } from 'react'

import { CollaboratorPopoverPicker } from '@/shared/components/CollaboratorPopoverPicker'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import type { OrgUser } from '@/shared/types/users'

import { RepaymentMentionTextarea } from './RepaymentMentionTextarea'

interface Props {
  url?: string
  comment: string
  onCommentChange: (comment: string) => void
  onCancel: () => void
  onSave: (user: OrgUser) => void
  saving?: boolean
}

export function RepaymentGestionnaireAssignForm({
  url,
  comment,
  onCommentChange,
  onCancel,
  onSave,
  saving
}: Props) {
  const { users, loading } = useOrgUsers(url)
  const commentId = useId()
  const [selected, setSelected] = useState<OrgUser | null>(null)

  return (
    <>
      <InspectorComposeField label="Référent">
        <CollaboratorPopoverPicker
          value={selected}
          users={users}
          loading={loading}
          disabled={saving}
          aria-label="Référent"
          onChange={setSelected}
        />
      </InspectorComposeField>
      <InspectorComposeField htmlFor={commentId} label="Note (optionnel)">
        <RepaymentMentionTextarea
          id={commentId}
          value={comment}
          onChange={onCommentChange}
          placeholder="Contexte sur cette affectation… Tapez @ pour mentionner un collègue"
          disabled={saving}
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={saving}>
        <Button
          type="button"
          size="sm"
          disabled={!selected || saving}
          onClick={() => {
            if (selected) onSave(selected)
          }}
        >
          Affecter
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

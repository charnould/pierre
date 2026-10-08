import { type FormEvent, useId, useMemo, useState } from 'react'

import { CollaboratorPopoverPicker } from '@/shared/components/CollaboratorPopoverPicker'
import { ActionCombobox } from '@/shared/components/inspector/action-combobox'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import {
  type ActionDraft,
  mapDoneActionForm,
  mapTodoForm
} from '@/shared/lib/activities/action-activity'
import type { OrgUser } from '@/shared/types/users'

interface Props {
  intent: 'todo' | 'done'
  actionLabels: string[]
  url?: string
  defaultAssignee?: string | null
  todayIso: string
  saving?: boolean
  onCancel?: () => void
  onSave: (draft: ActionDraft) => void | Promise<boolean | void>
}

export function ActionPicker({
  intent,
  actionLabels,
  url,
  defaultAssignee,
  todayIso,
  saving = false,
  onCancel,
  onSave
}: Props) {
  const dueId = useId()
  const commentId = useId()
  const todayDate = todayIso.slice(0, 10)
  const { users, loading } = useOrgUsers(url)
  const defaultUser = useMemo(
    () =>
      users.find(
        (user) =>
          user.email.toLowerCase() === defaultAssignee?.toLowerCase() ||
          user.login.toLowerCase() === defaultAssignee?.toLowerCase()
      ) ?? null,
    [defaultAssignee, users]
  )
  const [actionLabel, setActionLabel] = useState('')
  const [comment, setComment] = useState('')
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [useDefaultAssignee, setUseDefaultAssignee] = useState(true)
  const [dateEcheance, setDateEcheance] = useState(todayDate)
  const assignee = useDefaultAssignee ? defaultUser : selectedUser
  const assigneeId = (assignee?.email ?? defaultAssignee ?? '').trim()
  const canSave =
    intent === 'todo'
      ? actionLabel.trim().length > 0 && assigneeId.length > 0 && dateEcheance.trim().length > 0
      : actionLabel.trim().length > 0
  const primaryLabel = intent === 'todo' ? 'Planifier' : 'Consigner'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const mapped =
      intent === 'todo'
        ? mapTodoForm({
            action: actionLabel.trim(),
            assigneA: assignee?.email ?? defaultAssignee ?? '',
            dateEcheance: dateEcheance || todayDate,
            note: comment
          })
        : mapDoneActionForm({ action: actionLabel.trim(), commentaire: comment })
    if (mapped) void onSave(mapped)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <InspectorComposeField label="Action">
        <ActionCombobox
          value={actionLabel}
          items={actionLabels}
          disabled={saving}
          onValueChange={setActionLabel}
        />
      </InspectorComposeField>

      {intent === 'todo' ? (
        <>
          <InspectorComposeField label="Qui">
            <CollaboratorPopoverPicker
              value={assignee}
              fallbackLogin={defaultAssignee ?? ''}
              users={users}
              loading={loading}
              disabled={saving}
              aria-label="Qui"
              onChange={(user) => {
                setUseDefaultAssignee(false)
                setSelectedUser(user)
              }}
            />
          </InspectorComposeField>
          <InspectorComposeField htmlFor={dueId} label="Quand">
            <DatePicker
              id={dueId}
              value={dateEcheance}
              onChange={setDateEcheance}
              disabled={saving}
              size="sm"
              aria-label="Quand"
            />
          </InspectorComposeField>
        </>
      ) : null}

      <InspectorComposeField htmlFor={commentId} label="Note">
        <MentionTextarea
          id={commentId}
          value={comment}
          onChange={setComment}
          placeholder="Optionnel. Tapez @ pour mentionner un collègue"
          disabled={saving}
          url={url}
        />
      </InspectorComposeField>

      <InspectorComposeFooter onCancel={() => onCancel?.()} pending={saving}>
        <Button type="submit" size="sm" disabled={!canSave || saving}>
          {primaryLabel}
        </Button>
      </InspectorComposeFooter>
    </form>
  )
}

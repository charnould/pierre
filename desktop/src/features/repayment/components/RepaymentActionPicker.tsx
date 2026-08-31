import { useId, useMemo, useState, type FormEvent } from 'react'

import { CollaboratorPopoverPicker } from '@/shared/components/CollaboratorPopoverPicker'
import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/shared/components/ui/combobox'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import type { OrgUser } from '@/shared/types/users'

import { REPAYMENT_DOSSIER_ACTION_OPTIONS } from '../lib/repayment-action'
import {
  mapRepaymentDoneActionForm,
  mapRepaymentTodoForm,
  type RepaymentActionDraft
} from '../lib/repayment-action-activity'
import { RepaymentMentionTextarea } from './RepaymentMentionTextarea'

const ACTION_LABELS = REPAYMENT_DOSSIER_ACTION_OPTIONS.map((option) => option.label)

interface Props {
  intent: 'todo' | 'done'
  url?: string
  defaultAssignee?: string | null
  todayIso: string
  saving?: boolean
  onCancel?: () => void
  onSave: (draft: RepaymentActionDraft) => void | Promise<boolean | void>
}

export function RepaymentActionPicker({
  intent,
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
  const [action, setAction] = useState<string | null>(null)
  const [actionQuery, setActionQuery] = useState('')
  const [comment, setComment] = useState('')
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [useDefaultAssignee, setUseDefaultAssignee] = useState(true)
  const [dateEcheance, setDateEcheance] = useState(todayDate)
  const assignee = useDefaultAssignee ? defaultUser : selectedUser
  const actionLabel = (action ?? actionQuery).trim()
  const canSave = actionLabel.length > 0
  const primaryLabel = intent === 'todo' ? 'Planifier' : 'Consigner'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const mapped =
      intent === 'todo'
        ? mapRepaymentTodoForm({
            action: actionLabel,
            assigneA: assignee?.email ?? defaultAssignee ?? '',
            dateEcheance: dateEcheance || todayDate,
            note: comment
          })
        : mapRepaymentDoneActionForm({ action: actionLabel, commentaire: comment })
    if (mapped) void onSave(mapped)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <InspectorComposeField label="Action">
        <Combobox
          autoHighlight
          items={ACTION_LABELS}
          value={action}
          onValueChange={(next) => setAction(typeof next === 'string' ? next : null)}
          onInputValueChange={(next) => setActionQuery(next)}
        >
          <ComboboxInput
            className="w-full"
            placeholder="Choisir une action…"
            showClear
            disabled={saving}
            aria-label="Action"
          />
          <ComboboxContent>
            <ComboboxEmpty>Aucune action</ComboboxEmpty>
            <ComboboxList>
              {(label) => (
                <ComboboxItem key={label} value={label}>
                  {label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
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
        <RepaymentMentionTextarea
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

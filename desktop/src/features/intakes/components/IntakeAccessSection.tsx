import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { CollaboratorsCombobox } from '@/shared/components/CollaboratorsCombobox'
import { ScheduleFields } from '@/shared/components/ScheduleFields'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import type { IntakeNotificationSchedule } from '@/shared/types/intakes'

interface Props {
  url: string | undefined
  ownerLogin: string
  mentions: string[]
  onMentionsChange: (mentions: string[]) => void
  notifications: IntakeNotificationSchedule
  onNotificationsChange: (notifications: IntakeNotificationSchedule) => void
  passwords: string[]
  onPasswordsChange: (passwords: string[]) => void
}

export function IntakeAccessSection({
  url,
  ownerLogin,
  mentions,
  onMentionsChange,
  notifications,
  onNotificationsChange,
  passwords,
  onPasswordsChange
}: Props) {
  const [newPassword, setNewPassword] = useState('')

  function handleAddPassword() {
    const trimmed = newPassword.trim()
    if (!trimmed) return
    if (!passwords.includes(trimmed)) {
      onPasswordsChange([...passwords, trimmed])
    }
    setNewPassword('')
  }

  return (
    <FieldSet>
      <FieldLegend>Accès et notifications</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel>Collaborateurs</FieldLabel>
          <CollaboratorsCombobox
            url={url}
            ownerLogin={ownerLogin}
            value={mentions}
            onValueChange={onMentionsChange}
          />
          <FieldDescription>
            Les collaborateurs ajoutés reçoivent les notifications et peuvent exporter les réponses.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Notifications</FieldLabel>
          <ScheduleFields
            idPrefix="intake-notifications"
            allowImmediate
            value={notifications}
            onChange={onNotificationsChange}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="intake-new-password">Mots de passe d’accès (optionnel)</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="intake-new-password"
              value={newPassword}
              placeholder="Ajouter un mot de passe accepté sur le formulaire public"
              onChange={(event) => setNewPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddPassword()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddPassword}>
              <Plus data-icon="inline-start" />
              Ajouter
            </Button>
          </div>
          {passwords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {passwords.map((password) => (
                <Button
                  key={password}
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label={`Retirer le mot de passe ${password}`}
                  onClick={() => onPasswordsChange(passwords.filter((entry) => entry !== password))}
                >
                  <span>{password}</span>
                  <X data-icon="inline-end" aria-hidden />
                </Button>
              ))}
            </div>
          ) : (
            <FieldDescription>
              Aucun mot de passe configuré : toute personne disposant du lien peut répondre.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}

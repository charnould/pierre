import { useId, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Spinner } from '@/shared/components/ui/spinner'
import { toast } from '@/shared/components/ui/toast'
import type { AdminUserProfile, AdminUsersData } from '@/shared/types/users'

interface Props {
  url: string
  profile: AdminUserProfile | null
  catalogues: Pick<AdminUsersData, 'modules' | 'chatbots'>
  onClose: () => void
  onSaved: (profile: AdminUserProfile) => void
}

export function ProfileFormDialog({ url, profile, catalogues, onClose, onSaved }: Props) {
  const fieldId = useId()
  const [name, setName] = useState(profile?.name ?? '')
  const [moduleIds, setModuleIds] = useState<AdminUserProfile['moduleIds']>(
    profile?.moduleIds ?? []
  )
  const [chatbotIds, setChatbotIds] = useState<string[]>(profile?.chatbotIds ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleModule(id: AdminUserProfile['moduleIds'][number], checked: boolean) {
    setModuleIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id)
    )
  }

  function toggleChatbot(id: string, checked: boolean) {
    setChatbotIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id)
    )
  }

  async function save() {
    if (!name.trim()) {
      setError('Nom obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const payload = { url, name: name.trim(), moduleIds, chatbotIds }
    const response = profile
      ? await window.api?.patchAdminUserProfile({ ...payload, id: profile.id })
      : await window.api?.createAdminUserProfile(payload)
    setSaving(false)
    if (!response) {
      setError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setError(response.error.message)
      return
    }
    onSaved(response.data.profile)
    toast.add({
      title: profile ? 'Profil modifié' : 'Profil créé',
      type: 'success'
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{profile ? 'Modifier le profil' : 'Créer un profil'}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-name`}>Nom</FieldLabel>
            <Input
              id={`${fieldId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <FieldSet>
            <FieldLegend>Modules</FieldLegend>
            <div data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
              {catalogues.modules.map((module) => (
                <Field key={module.id} orientation="horizontal">
                  <Checkbox
                    id={`${fieldId}-module-${module.id}`}
                    checked={moduleIds.includes(module.id)}
                    onCheckedChange={(checked) => toggleModule(module.id, checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-module-${module.id}`}>{module.label}</FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Chatbots</FieldLegend>
            <div data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
              {catalogues.chatbots.map((chatbot) => (
                <Field key={chatbot.id} orientation="horizontal">
                  <Checkbox
                    id={`${fieldId}-chatbot-${chatbot.id}`}
                    checked={chatbotIds.includes(chatbot.id)}
                    onCheckedChange={(checked) => toggleChatbot(chatbot.id, checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-chatbot-${chatbot.id}`}>
                    {chatbot.label}
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Spinner /> : null}
            {profile ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

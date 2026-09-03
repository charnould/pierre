import { Copy, Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'

import { SelectItems } from '@/shared/components/SelectItems'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/shared/components/ui/input-group'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Spinner } from '@/shared/components/ui/spinner'
import { Switch } from '@/shared/components/ui/switch'
import { toast } from '@/shared/components/ui/toast'
import type { AdminUser, AdminUsersData } from '@/shared/types/users'

interface Props {
  url: string
  currentUserEmail: string
  user: AdminUser | null
  catalogues: Pick<AdminUsersData, 'modules' | 'chatbots' | 'profiles'>
  onClose: () => void
  onCurrentUserPasswordChange: () => Promise<void>
  onSaved: (user: AdminUser) => void
}

export const createProposedPassword = (): string =>
  crypto.randomUUID().replaceAll('-', '').slice(0, 20)

export function UserFormDialog({
  url,
  currentUserEmail,
  user,
  catalogues,
  onClose,
  onCurrentUserPasswordChange,
  onSaved
}: Props) {
  const fieldId = useId()
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState(() => (user ? '' : createProposedPassword()))
  const [showPassword, setShowPassword] = useState(false)
  const [isAdministrator, setIsAdministrator] = useState(user?.isAdministrator ?? false)
  const [profileId, setProfileId] = useState<string | null>(user?.profileId ?? null)
  const [moduleIds, setModuleIds] = useState<AdminUser['moduleIds']>(user?.moduleIds ?? [])
  const [chatbotIds, setChatbotIds] = useState<string[]>(user?.chatbotIds ?? [])
  const locked = profileId !== null
  const profileItems = [
    { label: 'Personnalisé', value: null },
    ...catalogues.profiles.map((profile) => ({ label: profile.name, value: profile.id }))
  ]
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleModule(id: AdminUser['moduleIds'][number], checked: boolean) {
    setModuleIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id)
    )
  }

  function toggleChatbot(id: string, checked: boolean) {
    setChatbotIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id)
    )
  }

  function applyProfile(next: string | null) {
    setProfileId(next)
    if (!next) return
    const profile = catalogues.profiles.find((entry) => entry.id === next)
    if (!profile) return
    setModuleIds(profile.moduleIds)
    setChatbotIds(profile.chatbotIds)
  }

  async function save() {
    if (!email.trim()) {
      setError('Adresse e-mail obligatoire.')
      return
    }
    if (!user && !password) {
      setError('Mot de passe obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    const common = {
      url,
      email: email.trim(),
      isAdministrator,
      moduleIds,
      chatbotIds,
      profileId,
      ...(password ? { password } : {})
    }
    const response = user
      ? await window.api?.patchAdminUser(common)
      : await window.api?.createAdminUser({ ...common, password })
    setSaving(false)
    if (!response) {
      setError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setError(response.error.message)
      return
    }

    if (response.data.user.email === currentUserEmail && password) {
      toast.add({ title: 'Mot de passe modifié. Reconnectez-vous.', type: 'success' })
      await onCurrentUserPasswordChange()
      onClose()
      return
    }
    onSaved(response.data.user)
    toast.add({
      title: user ? 'Utilisateur modifié' : 'Utilisateur créé',
      type: 'success'
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{user ? 'Modifier l’utilisateur' : 'Créer un utilisateur'}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>Compte</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-email`}>Adresse e-mail</FieldLabel>
                <Input
                  id={`${fieldId}-email`}
                  type="email"
                  value={email}
                  disabled={Boolean(user)}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-password`}>
                  {user ? 'Nouveau mot de passe' : 'Mot de passe'}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={`${fieldId}-password`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={user ? 'Laisser vide pour ne pas le modifier' : undefined}
                    autoComplete="new-password"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label={
                        showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                      }
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      disabled={!password}
                      aria-label="Copier le mot de passe"
                      onClick={() => void navigator.clipboard.writeText(password)}
                    >
                      <Copy />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Profil</FieldLegend>
            <Field>
              <FieldLabel htmlFor={`${fieldId}-profile`}>Affectation</FieldLabel>
              <Select items={profileItems} value={profileId} onValueChange={applyProfile}>
                <SelectTrigger id={`${fieldId}-profile`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItems items={profileItems} />
                </SelectContent>
              </Select>
            </Field>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Modules</FieldLegend>
            <div data-slot="checkbox-group" className="grid grid-cols-2 gap-2">
              {catalogues.modules.map((module) => (
                <Field key={module.id} orientation="horizontal">
                  <Checkbox
                    id={`${fieldId}-module-${module.id}`}
                    checked={moduleIds.includes(module.id)}
                    disabled={locked}
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
                    disabled={locked}
                    onCheckedChange={(checked) => toggleChatbot(chatbot.id, checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-chatbot-${chatbot.id}`}>
                    {chatbot.label}
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Administration</FieldLegend>
            <Field orientation="horizontal">
              <Switch
                id={`${fieldId}-administrator`}
                checked={isAdministrator}
                onCheckedChange={(checked) => setIsAdministrator(checked === true)}
              />
              <FieldLabel htmlFor={`${fieldId}-administrator`}>Administrateur</FieldLabel>
            </Field>
          </FieldSet>
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Spinner /> : null}
            {user ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

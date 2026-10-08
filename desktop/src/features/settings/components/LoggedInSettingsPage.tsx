import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { HomeExcerptField } from '@/features/settings/components/HomeExcerptField'
import { IdentityField } from '@/features/settings/components/IdentityField'
import { type MascotAppearance, MascotField } from '@/features/settings/components/MascotField'
import { useAppVersion } from '@/features/settings/hooks/useAppVersion'
import { runAppUpdateCheck } from '@/features/settings/lib/app-version-check'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Spinner } from '@/shared/components/ui/spinner'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import {
  DEFAULT_MASCOT_SETTINGS,
  FACTORY_UI_SETTINGS_FILE_CONTENT,
  type HomeSettings,
  isUiSettingsFileObject,
  listDroppedUiSettingsKeys,
  resolveHomeSettings,
  UI_SETTINGS_EXAMPLE
} from '@/shared/lib/ui-settings/schema'
import type { Settings } from '@/shared/types'
import { DEFAULT_UPDATES_NOTIFY_SCOPE } from '@/shared/types/settings'
import type { UserPrincipal } from '@/shared/types/users'

interface Props {
  settings: Settings
  user: UserPrincipal
  agentName: string
  onHome: () => void
  onUserChange: (user: UserPrincipal) => void
  onLogout: () => void
}

export function LoggedInSettingsPage({
  settings,
  user,
  agentName,
  onHome,
  onUserChange,
  onLogout
}: Props) {
  const jsonFieldId = useId()
  const { resetToFactory, save, settings: uiSettings, reload } = useUiSettings()
  const [text, setText] = useState(FACTORY_UI_SETTINGS_FILE_CONTENT)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [jsonDirty, setJsonDirty] = useState(false)
  const jsonDirtyRef = useRef(jsonDirty)
  useEffect(() => {
    jsonDirtyRef.current = jsonDirty
  })
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [mascotToggling, setMascotToggling] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'logout' | null>(null)
  const appVersion = useAppVersion()

  const homeExcerpts = resolveHomeSettings(uiSettings)

  const persistHome = useCallback(
    async (home: HomeSettings) => {
      if (!window.api?.getUiSettingsFile) return
      let parsed: unknown
      try {
        parsed = JSON.parse(await window.api.getUiSettingsFile())
      } catch {
        return
      }
      if (!isUiSettingsFileObject(parsed)) return
      await save({ ...parsed, home })
    },
    [save]
  )

  const mascotEnabled = uiSettings.mascot?.enabled ?? true
  const mascotSize = uiSettings.mascot?.size ?? DEFAULT_MASCOT_SETTINGS.size!
  const mascotShape = uiSettings.mascot?.shape ?? DEFAULT_MASCOT_SETTINGS.shape!
  const mascotColor = uiSettings.mascot?.color ?? DEFAULT_MASCOT_SETTINGS.color!

  const mascotBadgeColor = uiSettings.mascot?.badgeColor ?? DEFAULT_MASCOT_SETTINGS.badgeColor!

  const handleMascotAppearanceChange = useCallback(
    async (next: MascotAppearance, { persist }: { persist: boolean }) => {
      if (window.api?.setMascotLook) {
        await window.api.setMascotLook({
          shape: next.shape,
          color: next.color,
          badgeColor: next.badgeColor,
          persist
        })
      }
      if (window.api?.setMascotSize) {
        await window.api.setMascotSize({ size: next.size, persist })
      }
      if (persist) await reload()
    },
    [reload]
  )

  const handleMascotEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (!window.api?.setMascotEnabled) return
      setMascotToggling(true)
      try {
        await window.api.setMascotEnabled(enabled)
        await reload()
      } finally {
        setMascotToggling(false)
      }
    },
    [reload]
  )

  const loadFile = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!window.api?.getUiSettingsFile) {
      if (!force && jsonDirtyRef.current) return
      setText(FACTORY_UI_SETTINGS_FILE_CONTENT)
      setJsonDirty(false)
      setError('')
      return
    }

    const content = await window.api.getUiSettingsFile()
    if (!force && jsonDirtyRef.current) return
    setText(content)
    setJsonDirty(false)
    setError('')
  }, [])

  useEffect(() => {
    if (jsonDirty) return
    void loadFile()
  }, [jsonDirty, loadFile, uiSettings])

  async function handleSave() {
    const hadChanges = jsonDirty
    setError('')
    setSaving(true)
    try {
      let droppedKeys: string[] = []
      if (jsonDirty) {
        const parsed = JSON.parse(text) as unknown
        if (!isUiSettingsFileObject(parsed)) {
          throw new Error('Le fichier d’interface doit être un objet JSON.')
        }
        droppedKeys = listDroppedUiSettingsKeys(parsed)
        await save(parsed)
        await loadFile({ force: true })
      }

      if (hadChanges) {
        if (droppedKeys.length > 0) {
          toast.add({
            title: 'Paramètres enregistrés',
            description: `Clés ignorées : ${droppedKeys.join(', ')}`,
            type: 'warning'
          })
        } else {
          toast.add({ title: 'Paramètres enregistrés', type: 'success' })
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide. Vérifiez la syntaxe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setError('')
    setSaving(true)
    try {
      await resetToFactory()
      await window.api.resetWindowToFactory()
      await window.api.saveSettings({
        updatesNotify: DEFAULT_UPDATES_NOTIFY_SCOPE
      })
      await window.api.logout()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de réinitialiser. Réessayez.')
      setSaving(false)
    }
  }

  async function handleCheckUpdates() {
    setCheckingUpdates(true)
    try {
      await runAppUpdateCheck(window.api, navigator.userAgent, navigator.platform, (message) =>
        toast.add({ title: message, type: 'info' })
      )
    } finally {
      setCheckingUpdates(false)
    }
  }

  async function handleLogout() {
    onLogout()
  }

  const session = [settings.email, settings.url].filter(Boolean).join(' · ')

  return (
    <div className="bg-background h-full min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Retour"
            onClick={onHome}
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-serif text-4xl leading-tight font-normal">Paramètres</h1>
        </div>
        {settings.url && settings.email ? (
          <IdentityField
            url={settings.url}
            email={settings.email}
            agentName={agentName}
            preferredName={user.preferredName}
            onPreferredNameChange={(preferredName) => onUserChange({ ...user, preferredName })}
          />
        ) : null}

        <MascotField
          enabled={mascotEnabled}
          onEnabledChange={(enabled) => void handleMascotEnabledChange(enabled)}
          size={mascotSize}
          shape={mascotShape}
          color={mascotColor}
          badgeColor={mascotBadgeColor}
          onAppearanceChange={(next, options) => void handleMascotAppearanceChange(next, options)}
          disabled={mascotToggling}
        />

        <HomeExcerptField value={homeExcerpts} onPersist={persistHome} />

        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup variant="rows">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Rechercher des mises à jour</FieldLabel>
                  {appVersion ? <FieldDescription>{appVersion}</FieldDescription> : null}
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  disabled={checkingUpdates}
                  onClick={() => void handleCheckUpdates()}
                >
                  {checkingUpdates ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                  Rechercher des mises à jour
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Se déconnecter</FieldLabel>
                  {session ? <FieldDescription>{session}</FieldDescription> : null}
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  onClick={() => {
                    if (jsonDirty) setConfirm('logout')
                    else void handleLogout()
                  }}
                >
                  Se déconnecter
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel>Réinitialiser</FieldLabel>
                  <FieldDescription>
                    Remet l’affichage d’usine, vous déconnecte, et recharge l’application.
                  </FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-end"
                  disabled={saving}
                  onClick={() => setConfirm('reset')}
                >
                  Réinitialiser
                </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fichier d’interface</CardTitle>
          </CardHeader>
          <CardContent>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={jsonFieldId} className="sr-only">
                Fichier d’interface
              </FieldLabel>
              <FieldDescription>
                JSON local : fenêtre, compagnon, accueil, tableau et panneaux. Enregistrer remplace
                le fichier entier. Partagez-le pour aligner l’affichage de l’équipe.
              </FieldDescription>
              <Textarea
                id={jsonFieldId}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setJsonDirty(true)
                  setError('')
                }}
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'ui-settings-json-error' : undefined}
                aria-errormessage={error ? 'ui-settings-json-error' : undefined}
                placeholder={UI_SETTINGS_EXAMPLE}
                className="max-h-96"
              />
              {error ? <FieldError id="ui-settings-json-error">{error}</FieldError> : null}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !jsonDirty}
                >
                  {saving ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                  Enregistrer
                </Button>
                <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
                  {jsonDirty ? 'Modifications à enregistrer' : 'Aucune modification'}
                </p>
              </div>
            </Field>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Réinitialiser les paramètres d’usine ?"
        description="Vous serez déconnecté et l’application va recharger. Cette action est immédiate."
        confirmLabel="Réinitialiser"
        confirmVariant="destructive"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          void handleReset()
        }}
      />
      <ConfirmDialog
        open={confirm === 'logout'}
        title="Se déconnecter ?"
        description="Les modifications non enregistrées seront perdues."
        confirmLabel="Se déconnecter"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          void handleLogout()
        }}
      />
    </div>
  )
}

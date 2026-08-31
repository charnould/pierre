import { RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { HistoricalAppsConnectionField } from '@/features/settings/components/HistoricalAppsConnectionField'
import { IdentityField } from '@/features/settings/components/IdentityField'
import { MascotField, type MascotAppearance } from '@/features/settings/components/MascotField'
import { useAppVersion } from '@/features/settings/hooks/useAppVersion'
import { runAppUpdateCheck } from '@/features/settings/lib/app-version-check'
import { panelScreen } from '@/features/workflow/components/WorkflowPanelChrome'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import {
  DEFAULT_MASCOT_SETTINGS,
  FACTORY_UI_SETTINGS_FILE_CONTENT,
  isUiSettingsFileObject,
  listDroppedUiSettingsKeys,
  UI_SETTINGS_EXAMPLE
} from '@/shared/lib/ui-settings/schema'
import type { Settings } from '@/shared/types'
import { DEFAULT_UPDATES_NOTIFY_SCOPE } from '@/shared/types/settings'

interface Props {
  settings: Settings
  agentName: string
  onLogout: () => void
  onSettingsChange: (settings: Settings) => void
}

export function LoggedInSettingsPage({ settings, agentName, onLogout }: Props) {
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
    await window.api.saveSettings({
      ...settings,
      password: '',
      loggedOut: true
    })
    await window.api.logout()
    onLogout()
  }

  const accountMeta = [settings.email, settings.url, appVersion].filter(Boolean).join(' · ')

  return (
    <motion.div
      className="bg-background h-full min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={panelScreen}
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <PageHeader
          title="Paramètres"
          meta={accountMeta || undefined}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={checkingUpdates}
                onClick={() => void handleCheckUpdates()}
              >
                {checkingUpdates ? 'Recherche…' : 'Rechercher des mises à jour'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (jsonDirty) setConfirm('logout')
                  else void handleLogout()
                }}
              >
                Se déconnecter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirm('reset')}
                disabled={saving}
              >
                <RotateCcw data-icon="inline-start" />
                Réinitialiser
              </Button>
            </>
          }
        />

        <FieldGroup className="mt-6">
          {settings.url && settings.email ? (
            <IdentityField url={settings.url} email={settings.email} agentName={agentName} />
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

          <HistoricalAppsConnectionField agentName={agentName} />

          <Field className="border-border rounded-md border p-4">
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={jsonFieldId}>Fichier d’interface</FieldLabel>
              <FieldDescription>
                JSON local : fenêtre, compagnon, tableau et panneaux. Enregistrer remplace le
                fichier entier. Partagez-le pour aligner l’affichage de l’équipe.
              </FieldDescription>
            </div>
            <Textarea
              id={jsonFieldId}
              aria-label="Fichier d’interface"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setJsonDirty(true)
                setError('')
              }}
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby="ui-settings-json-error"
              aria-errormessage="ui-settings-json-error"
              placeholder={UI_SETTINGS_EXAMPLE}
              className="text-foreground/90 [field-sizing:fixed] min-h-52 resize-y font-mono text-xs leading-normal"
            />
            {error ? (
              <FieldError id="ui-settings-json-error">{error}</FieldError>
            ) : (
              <span id="ui-settings-json-error" className="sr-only" />
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !jsonDirty}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </Field>
        </FieldGroup>
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
    </motion.div>
  )
}

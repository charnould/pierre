import { RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useId, useState } from 'react'
import { toast } from 'sonner'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { HistoricalAppsConnectionField } from '@/features/settings/HistoricalAppsConnectionField'
import { useAppVersion } from '@/features/settings/hooks/useAppVersion'
import { runAppUpdateCheck } from '@/features/settings/lib/app-version-check'
import {
  SETTINGS_ACCOUNT_META,
  SETTINGS_BODY,
  SETTINGS_CAPTION,
  SETTINGS_COLUMN,
  SETTINGS_FIELD_GROUP,
  SETTINGS_FIELD_LABEL,
  SETTINGS_FIELD_STACK,
  SETTINGS_FOOTER,
  SETTINGS_FRAME,
  SETTINGS_HEADER,
  SETTINGS_HEADING,
  SETTINGS_MAIN,
  SETTINGS_SHELL
} from '@/features/settings/settings-chrome'
import { UpdatesNotifyField } from '@/features/settings/UpdatesNotifyField'
import { panelScreen, PANEL_BG_CLASS } from '@/features/workflow/components/WorkflowPanelChrome'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  FACTORY_UI_SETTINGS_FILE_CONTENT,
  isFactoryUiSettingsFileContent,
  UI_SETTINGS_EXAMPLE
} from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types'
import {
  DEFAULT_UPDATES_NOTIFY_SCOPE,
  isFactoryUpdatesNotifySettings,
  resolveUpdatesNotifyScope,
  type UpdatesNotifyScope
} from '@/shared/types/settings'

interface Props {
  settings: Settings
  agentName: string
  onLogout: () => void
  onSettingsChange: (settings: Settings) => void
}

export function LoggedInSettingsPage({ settings, agentName, onLogout, onSettingsChange }: Props) {
  const jsonFieldId = useId()
  const { resetToFactory, save } = useUiSettings()
  const [text, setText] = useState(FACTORY_UI_SETTINGS_FILE_CONTENT)
  const [notifyScope, setNotifyScope] = useState(() => resolveUpdatesNotifyScope(settings))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [jsonDirty, setJsonDirty] = useState(false)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const appVersion = useAppVersion()

  const persistedNotifyScope = resolveUpdatesNotifyScope(settings)
  const notifyDirty = notifyScope !== persistedNotifyScope
  const dirty = jsonDirty || notifyDirty

  const loadFile = useCallback(async () => {
    if (!window.api?.getUiSettingsFile) {
      setText(FACTORY_UI_SETTINGS_FILE_CONTENT)
      setJsonDirty(false)
      setError('')
      return
    }

    const content = await window.api.getUiSettingsFile()
    setText(content)
    setJsonDirty(false)
    setError('')
  }, [])

  const notifyAtFactory = isFactoryUpdatesNotifySettings(settings)
  const jsonAtFactory = isFactoryUiSettingsFileContent(text)
  const canReset = jsonDirty || notifyDirty || !jsonAtFactory || !notifyAtFactory

  useEffect(() => {
    void loadFile()
  }, [loadFile])

  useEffect(() => {
    setNotifyScope(resolveUpdatesNotifyScope(settings))
  }, [settings.updatesNotify])

  async function handleSave() {
    const hadChanges = jsonDirty || notifyDirty
    setError('')
    setSaving(true)
    try {
      if (jsonDirty) {
        const parsed = JSON.parse(text) as unknown
        if (isFactoryUiSettingsFileContent(text)) {
          await resetToFactory()
        } else {
          await save(parsed)
        }
        await loadFile()
      }

      if (notifyDirty) {
        const nextSettings = { ...settings, updatesNotify: notifyScope }
        await window.api.saveSettings(nextSettings)
        onSettingsChange(nextSettings)
      }

      if (hadChanges) {
        toast.success('Paramètres enregistrés')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON invalide.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Réinitialiser tous les paramètres aux valeurs d'usine, vous déconnecter et recharger l'application ? Cette action est immédiate."
      )
    ) {
      return
    }

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
      setError(e instanceof Error ? e.message : 'Réinitialisation impossible.')
      setSaving(false)
    }
  }

  function handleNotifyChange(scope: UpdatesNotifyScope) {
    setNotifyScope(scope)
  }

  async function handleCheckUpdates() {
    setCheckingUpdates(true)
    try {
      await runAppUpdateCheck(window.api, navigator.userAgent, navigator.platform, (message) =>
        toast.info(message)
      )
    } finally {
      setCheckingUpdates(false)
    }
  }

  async function handleLogout() {
    if (
      dirty &&
      !window.confirm(
        'Des modifications non enregistrées seront perdues. Se déconnecter quand même ?'
      )
    ) {
      return
    }

    await window.api.saveSettings({
      ...settings,
      password: '',
      loggedOut: true
    })
    await window.api.logout()
    onLogout()
  }

  const accountLabel = [settings.email, settings.url].filter(Boolean).join(' · ')

  return (
    <motion.div
      className={`${SETTINGS_SHELL} ${PANEL_BG_CLASS}`}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={panelScreen}
    >
      <div className={SETTINGS_FRAME}>
        <div className={SETTINGS_COLUMN}>
          <div className={SETTINGS_HEADER}>
            <h1 className={SETTINGS_HEADING}>Paramètres</h1>
            {accountLabel ? (
              <p className={SETTINGS_ACCOUNT_META}>{accountLabel}</p>
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={checkingUpdates}
                onClick={() => void handleCheckUpdates()}
              >
                {checkingUpdates
                  ? 'Vérification…'
                  : `Vérifier les mises à jour (${appVersion ?? '…'})`}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleLogout()}>
                Se déconnecter
              </Button>
            </div>
          </div>

          <div className={SETTINGS_MAIN}>
            <div className={SETTINGS_BODY}>
              <FieldGroup className={SETTINGS_FIELD_GROUP}>
                <UpdatesNotifyField value={notifyScope} onValueChange={handleNotifyChange} />

                <HistoricalAppsConnectionField agentName={agentName} />

                <Field className={cn(SETTINGS_FIELD_STACK, 'min-h-0 flex-1')}>
                  <FieldLabel htmlFor={jsonFieldId} className={SETTINGS_FIELD_LABEL}>
                    Configuration de l'interface
                  </FieldLabel>
                  <FieldDescription className={SETTINGS_CAPTION}>
                    L'interface de {agentName} est pilotée par un fichier JSON. Vous pouvez
                    personnaliser les fonctionnalités, l'affichage et les accès selon votre
                    organisation. Ce fichier peut être distribué à l'ensemble des équipes pour
                    appliquer rapidement une configuration commune et garantir une expérience
                    cohérente entre les utilisateurs.
                  </FieldDescription>

                  <Textarea
                    id={jsonFieldId}
                    variant="desk"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      setJsonDirty(true)
                      setError('')
                    }}
                    spellCheck={false}
                    aria-invalid={!!error}
                    placeholder={UI_SETTINGS_EXAMPLE}
                    className="text-foreground/90 [field-sizing:fixed] min-h-52 flex-1 resize-none overflow-auto font-mono text-xs leading-normal"
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
              </FieldGroup>
            </div>

            <footer className={SETTINGS_FOOTER}>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleReset()}
                disabled={saving || !canReset}
              >
                <RotateCcw className="size-4" />
                Réinitialiser
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving || !dirty}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

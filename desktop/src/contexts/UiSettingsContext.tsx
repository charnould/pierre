import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type {
  TicketsTableSettings,
  UiSettings,
  WorkflowSettings
} from '@/shared/lib/ui-settings/schema'
import { UI_SETTINGS_DEFAULTS } from '@/shared/lib/ui-settings/schema'

type UiSettingsContextValue = {
  settings: UiSettings
  settingsPath: string | null
  loading: boolean
  /**
   * Increments when settings are reloaded or replaced via the JSON editor.
   * Table patches intentionally do not bump this (avoids stomping local edits).
   */
  settingsEpoch: number
  reload: () => Promise<void>
  resetToFactory: () => Promise<void>
  save: (raw: unknown) => Promise<UiSettings>
  patchTicketsTable: (partial: Partial<TicketsTableSettings>) => Promise<UiSettings>
  patchWorkflow: (partial: Partial<WorkflowSettings>) => Promise<UiSettings>
}

const UiSettingsContext = createContext<UiSettingsContextValue | null>(null)

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>(UI_SETTINGS_DEFAULTS)
  const [settingsPath, setSettingsPath] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [inFlight, setInFlight] = useState(false)
  const [settingsEpoch, setSettingsEpoch] = useState(0)
  const hasSettingsApi = Boolean(window.api?.getUiSettings)
  const loading = (hasSettingsApi && !hydrated) || inFlight

  const reload = useCallback(async () => {
    if (!window.api?.getUiSettings) {
      setSettings(UI_SETTINGS_DEFAULTS)
      return
    }

    setInFlight(true)
    try {
      const [nextSettings, path] = await Promise.all([
        window.api.getUiSettings(),
        window.api.getUiSettingsPath()
      ])
      setSettings(nextSettings)
      setSettingsPath(path)
      setSettingsEpoch((n) => n + 1)
      setHydrated(true)
    } finally {
      setInFlight(false)
    }
  }, [])

  const resetToFactory = useCallback(async () => {
    if (window.api?.resetUiSettings) {
      setInFlight(true)
      try {
        const next = await window.api.resetUiSettings()
        setSettings(next)
        setSettingsEpoch((n) => n + 1)
      } finally {
        setInFlight(false)
      }
      return
    }

    if (window.api?.saveUiSettings) {
      setInFlight(true)
      try {
        const next = await window.api.saveUiSettings({})
        setSettings(next)
        setSettingsEpoch((n) => n + 1)
      } finally {
        setInFlight(false)
      }
      return
    }

    setSettings(UI_SETTINGS_DEFAULTS)
    setSettingsEpoch((n) => n + 1)
  }, [])

  const save = useCallback(async (raw: unknown) => {
    if (!window.api?.saveUiSettings) return UI_SETTINGS_DEFAULTS
    const next = await window.api.saveUiSettings(raw)
    setSettings(next)
    setSettingsEpoch((n) => n + 1)
    return next
  }, [])

  const patchTicketsTable = useCallback(async (partial: Partial<TicketsTableSettings>) => {
    if (!window.api?.patchUiSettingsTicketsTable) return UI_SETTINGS_DEFAULTS
    const next = await window.api.patchUiSettingsTicketsTable(partial)
    setSettings(next)
    return next
  }, [])

  const patchWorkflow = useCallback(async (partial: Partial<WorkflowSettings>) => {
    if (!window.api?.patchUiSettingsWorkflow) return UI_SETTINGS_DEFAULTS
    const next = await window.api.patchUiSettingsWorkflow(partial)
    setSettings(next)
    return next
  }, [])

  useEffect(() => {
    if (!window.api?.getUiSettings) return
    let cancelled = false
    void Promise.all([window.api.getUiSettings(), window.api.getUiSettingsPath()]).then(
      ([nextSettings, path]) => {
        if (cancelled) return
        setSettings(nextSettings)
        setSettingsPath(path)
        setSettingsEpoch((n) => n + 1)
        setHydrated(true)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      settings,
      settingsPath,
      loading,
      settingsEpoch,
      reload,
      resetToFactory,
      save,
      patchTicketsTable,
      patchWorkflow
    }),
    [
      settings,
      settingsPath,
      loading,
      settingsEpoch,
      reload,
      resetToFactory,
      save,
      patchTicketsTable,
      patchWorkflow
    ]
  )

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>
}

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext)
  if (!ctx) throw new Error('useUiSettings must be used within UiSettingsProvider')
  return ctx
}

/** Settings, or factory defaults outside the provider. */
export function useResolvedUiSettings(): UiSettings {
  const ctx = useContext(UiSettingsContext)
  return ctx?.settings ?? UI_SETTINGS_DEFAULTS
}

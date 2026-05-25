import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type {
  AutomationsSettings,
  TicketsTableSettings,
  UiSettings,
  UpdatesSettings,
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
  patchAutomations: (partial: Partial<AutomationsSettings>) => Promise<UiSettings>
  patchUpdates: (partial: Partial<UpdatesSettings>) => Promise<UiSettings>
}

const UiSettingsContext = createContext<UiSettingsContextValue | null>(null)

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>(UI_SETTINGS_DEFAULTS)
  const [settingsPath, setSettingsPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsEpoch, setSettingsEpoch] = useState(0)

  const reload = useCallback(async () => {
    if (!window.api?.getUiSettings) {
      setSettings(UI_SETTINGS_DEFAULTS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [nextSettings, path] = await Promise.all([
        window.api.getUiSettings(),
        window.api.getUiSettingsPath()
      ])
      setSettings(nextSettings)
      setSettingsPath(path)
      setSettingsEpoch((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetToFactory = useCallback(async () => {
    if (window.api?.resetUiSettings) {
      setLoading(true)
      try {
        const next = await window.api.resetUiSettings()
        setSettings(next)
        setSettingsEpoch((n) => n + 1)
      } finally {
        setLoading(false)
      }
      return
    }

    if (window.api?.saveUiSettings) {
      setLoading(true)
      try {
        const next = await window.api.saveUiSettings({})
        setSettings(next)
        setSettingsEpoch((n) => n + 1)
      } finally {
        setLoading(false)
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
    let merged = next
    setSettings((prev) => {
      merged = {
        ...next,
        tickets: {
          ...next.tickets,
          table: {
            ...next.tickets?.table,
            columnValues: next.tickets?.table?.columnValues ?? prev.tickets?.table?.columnValues
          }
        }
      }
      return merged
    })
    return merged
  }, [])

  const patchWorkflow = useCallback(async (partial: Partial<WorkflowSettings>) => {
    if (!window.api?.patchUiSettingsWorkflow) return UI_SETTINGS_DEFAULTS
    const next = await window.api.patchUiSettingsWorkflow(partial)
    setSettings(next)
    return next
  }, [])

  const patchAutomations = useCallback(async (partial: Partial<AutomationsSettings>) => {
    if (!window.api?.patchUiSettingsAutomations) return UI_SETTINGS_DEFAULTS
    const next = await window.api.patchUiSettingsAutomations(partial)
    setSettings(next)
    return next
  }, [])

  const patchUpdates = useCallback(async (partial: Partial<UpdatesSettings>) => {
    if (!window.api?.patchUiSettingsUpdates) return UI_SETTINGS_DEFAULTS
    const next = await window.api.patchUiSettingsUpdates(partial)
    setSettings(next)
    return next
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

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
      patchWorkflow,
      patchAutomations,
      patchUpdates
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
      patchWorkflow,
      patchAutomations,
      patchUpdates
    ]
  )

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>
}

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext)
  if (!ctx) throw new Error('useUiSettings must be used within UiSettingsProvider')
  return ctx
}

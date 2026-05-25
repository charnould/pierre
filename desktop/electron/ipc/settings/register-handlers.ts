import { ipcMain, type BrowserWindow } from 'electron'

import type {
  AutomationsSettings,
  TicketsTableSettings,
  UpdatesSettings,
  WorkflowSettings
} from '../../../src/shared/lib/ui-settings/schema'
import { resolveUiSettingsFromRaw } from '../../../src/shared/lib/ui-settings/schema'
import type { SettingsStore } from '../../services/settings-store'
import { applyWindowBoundsFromSettings, type WindowStateHandle } from '../../services/window-state'
import { IpcChannel } from '../channels'

type SettingsHandlersContext = {
  getWindow: () => BrowserWindow | null
  getWindowStateHandle: () => WindowStateHandle | null
}

/**
 * Registers settings-related IPC handlers.
 */
export function registerSettingsHandlers(
  store: SettingsStore,
  uiSettingsPath: string,
  ctx?: SettingsHandlersContext
): void {
  ipcMain.handle(IpcChannel.settings.get, () => store.readSettings() ?? {})

  ipcMain.handle(IpcChannel.settings.save, (_, data) => {
    store.writeSettings(data)
    return true
  })

  ipcMain.handle(IpcChannel.uiSettings.get, () =>
    resolveUiSettingsFromRaw(store.readUiSettingsRaw())
  )

  ipcMain.handle(IpcChannel.uiSettings.getFile, () => store.readUiSettingsContent())

  ipcMain.handle(IpcChannel.uiSettings.save, async (_, raw) => {
    const result = await store.writeUiSettingsSerialized(raw)
    if (ctx && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      applyWindowBoundsFromSettings(
        ctx.getWindow(),
        raw as Record<string, unknown>,
        ctx.getWindowStateHandle()
      )
    }
    return result
  })

  ipcMain.handle(
    IpcChannel.uiSettings.patchTicketsTable,
    (_, partial: Partial<TicketsTableSettings>) => store.patchTicketsTableSerialized(partial)
  )

  ipcMain.handle(IpcChannel.uiSettings.patchWorkflow, (_, partial: Partial<WorkflowSettings>) =>
    store.patchWorkflowSerialized(partial)
  )

  ipcMain.handle(
    IpcChannel.uiSettings.patchAutomations,
    (_, partial: Partial<AutomationsSettings>) => store.patchAutomationsSerialized(partial)
  )

  ipcMain.handle(IpcChannel.uiSettings.patchUpdates, (_, partial: Partial<UpdatesSettings>) =>
    store.patchUpdatesSerialized(partial)
  )

  ipcMain.handle(IpcChannel.uiSettings.getPath, () => uiSettingsPath)

  ipcMain.handle(IpcChannel.uiSettings.reset, async () => {
    const result = await store.resetUiSettingsSerialized()
    if (ctx) {
      applyWindowBoundsFromSettings(
        ctx.getWindow(),
        { window: result.window ?? {} },
        ctx.getWindowStateHandle()
      )
    }
    return result
  })
}

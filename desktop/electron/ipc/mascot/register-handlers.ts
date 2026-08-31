import { ipcMain } from 'electron'

import type { UiSettings } from '../../../src/shared/lib/ui-settings/schema'
import type { MascotController } from '../../mascot-window'
import { IpcChannel } from '../channels'

type MascotHandlersContext = {
  getMascot: () => MascotController | null
  /** Drive the main-process badge poller from renderer login state. */
  onLoggedInChange?: (loggedIn: boolean) => void
}

/**
 * Registers desktop-mascot IPC handlers (unread badge, activate, drag, visibility).
 */
export function registerMascotHandlers(ctx: MascotHandlersContext): void {
  ipcMain.handle(IpcChannel.mascot.setUnreadCount, (_, count: number) => {
    ctx.getMascot()?.setUnreadCount(typeof count === 'number' ? count : 0)
    return true
  })

  ipcMain.handle(IpcChannel.mascot.activate, () => {
    ctx.getMascot()?.activate()
    return true
  })

  ipcMain.handle(
    IpcChannel.mascot.setBounds,
    (_, params: { x?: number; y?: number; dx?: number; dy?: number; persist?: boolean }) => {
      if (!params || typeof params !== 'object') return false
      ctx.getMascot()?.setBounds(params)
      return true
    }
  )

  ipcMain.handle(IpcChannel.mascot.setEnabled, async (_, enabled: boolean) => {
    const mascot = ctx.getMascot()
    if (!mascot) return {} as UiSettings
    return mascot.setEnabled(Boolean(enabled))
  })

  ipcMain.handle(IpcChannel.mascot.setSize, (_, params: { size: number; persist?: boolean }) => {
    if (!params || typeof params.size !== 'number') return false
    ctx.getMascot()?.setSize(params)
    return true
  })

  ipcMain.handle(
    IpcChannel.mascot.setLook,
    (_, params: { shape?: string; color?: string; badgeColor?: string; persist?: boolean }) => {
      if (!params || typeof params !== 'object') return false
      ctx.getMascot()?.setLook(params)
      return true
    }
  )

  ipcMain.handle(IpcChannel.mascot.showMenu, () => {
    ctx.getMascot()?.showMenu()
    return true
  })

  ipcMain.handle(IpcChannel.mascot.syncVisibility, (_, loggedIn: boolean) => {
    const next = Boolean(loggedIn)
    ctx.getMascot()?.syncVisibility(next)
    ctx.onLoggedInChange?.(next)
    return true
  })
}

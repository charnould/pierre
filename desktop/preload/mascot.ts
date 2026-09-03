import { contextBridge, ipcRenderer } from 'electron'

// Must match `electron/ipc/channels.ts`. Do not import that module: two preload
// entries sharing it makes Rolldown emit `require('./chunks/…')`, which sandboxed
// Electron cannot load.
const activate = 'mascot-activate'
const setBounds = 'mascot-set-bounds'
const showMenu = 'mascot-show-menu'
const lookEvent = 'mascot:look'
const unreadCountEvent = 'mascot:unread-count'

contextBridge.exposeInMainWorld('api', {
  activateFromMascot: () => ipcRenderer.invoke(activate) as Promise<boolean>,
  setMascotBounds: (params: {
    x?: number
    y?: number
    dx?: number
    dy?: number
    persist?: boolean
  }) => ipcRenderer.invoke(setBounds, params) as Promise<boolean>,
  showMascotMenu: () => ipcRenderer.invoke(showMenu) as Promise<boolean>,
  onMascotUnreadCount: (cb: (payload: { count: number; orbit: boolean }) => void) => {
    const listener = (_: unknown, payload: { count: number; orbit: boolean } | number) => {
      if (typeof payload === 'number') {
        cb({ count: payload, orbit: true })
        return
      }
      cb({
        count: typeof payload?.count === 'number' ? payload.count : 0,
        orbit: payload?.orbit !== false
      })
    }
    ipcRenderer.on(unreadCountEvent, listener)
    return () => {
      ipcRenderer.removeListener(unreadCountEvent, listener)
    }
  },
  onMascotLook: (cb: (look: { shape: string; color: string; badgeColor: string }) => void) => {
    const listener = (_: unknown, next: { shape: string; color: string; badgeColor: string }) =>
      cb(next)
    ipcRenderer.on(lookEvent, listener)
    return () => {
      ipcRenderer.removeListener(lookEvent, listener)
    }
  }
})

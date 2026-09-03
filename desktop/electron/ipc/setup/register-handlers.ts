import { ipcMain, session } from 'electron'

import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

const root = (url: string) => url.replace(/\/$/, '')

export function registerSetupHandlers(partition: string): void {
  const ses = () => session.fromPartition(partition)

  ipcMain.handle(IpcChannel.setup.get, async (_, { url }: { url: string }) => {
    try {
      const resp = await netFetch(`${root(url)}/desktop/setup`, { session: ses() })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-setup', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.setup.file, async (_, { url, id }: { url: string; id: string }) => {
    try {
      const resp = await netFetch(
        `${root(url)}/desktop/setup/${id
          .split('/')
          .map((part) => encodeURIComponent(part))
          .join('/')}`,
        { session: ses() }
      )
      if (!resp.ok) return null
      return await resp.arrayBuffer()
    } catch (error) {
      logMainError('get-setup-file', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.setup.adminGet, async (_, { url }: { url: string }) => {
    try {
      const resp = await netFetch(`${root(url)}/desktop/admin/setup`, { session: ses() })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-admin-setup', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.setup.adminPut,
    async (
      _,
      { url, id, body, bytes }: { url: string; id: string; body?: string; bytes?: Uint8Array }
    ) => {
      try {
        const payload = bytes ?? new TextEncoder().encode(body ?? '')
        const path = id
          .split('/')
          .map((part) => encodeURIComponent(part))
          .join('/')
        const copy = new ArrayBuffer(payload.byteLength)
        new Uint8Array(copy).set(payload)
        const resp = await netFetch(`${root(url)}/desktop/admin/setup/${path}`, {
          session: ses(),
          method: 'PUT',
          body: new Blob([copy])
        })
        if (!resp.ok) return null
        return await resp.json()
      } catch (error) {
        logMainError('put-admin-setup', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.setup.adminDelete,
    async (_, { url, id }: { url: string; id: string }) => {
      try {
        const resp = await netFetch(
          `${root(url)}/desktop/admin/setup/chatbots/${encodeURIComponent(id)}`,
          { session: ses(), method: 'DELETE' }
        )
        if (!resp.ok) return null
        return await resp.json()
      } catch (error) {
        logMainError('delete-admin-chatbot', error)
        return null
      }
    }
  )
}

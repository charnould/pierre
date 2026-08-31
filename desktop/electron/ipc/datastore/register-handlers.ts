import { ipcMain, session } from 'electron'

import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

/**
 * Registers desktop datastore IPC handlers.
 */
export function registerDatastoreHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.datastore.tables, async (_, { url }: { url: string }) => {
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(`${url}/desktop/datastore/tables`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-datastore-tables', error)
      return null
    }
  })
}

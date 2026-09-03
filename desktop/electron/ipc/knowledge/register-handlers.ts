import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { BrowserWindow, dialog, ipcMain, session } from 'electron'

import type {
  KnowledgeBuildResponse,
  KnowledgeBuildsResponse,
  KnowledgeEntry,
  KnowledgeResponse,
  KnowledgeSourceResponse,
  KnowledgeUploadResponse
} from '../../../src/shared/types/knowledge'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

const windowForDialog = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
const endpoint = (url: string, path = '') => `${url.replace(/\/$/, '')}/api/admin/knowledge${path}`

export function registerKnowledgeHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.knowledge.get, async (_, { url }: { url: string }) => {
    try {
      const response = await netFetch(endpoint(url), {
        session: session.fromPartition(partition)
      })
      return (await response.json()) as KnowledgeResponse
    } catch (error) {
      logMainError('get-admin-knowledge', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.knowledge.upload, async (_, { url }: { url: string }) => {
    const win = windowForDialog()
    const options = {
      title: 'Ajouter des sources',
      properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>,
      filters: [
        {
          name: 'Documents',
          extensions: ['csv', 'md', 'docx', 'xlsx', 'xls', 'xlsm', 'xlsb']
        }
      ]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    try {
      const form = new FormData()
      for (const path of result.filePaths) {
        const bytes = await readFile(path)
        form.append('files[]', new File([bytes], basename(path)))
      }
      const response = await netFetch(endpoint(url, '/sources'), {
        session: session.fromPartition(partition),
        method: 'POST',
        body: form
      })
      return (await response.json()) as KnowledgeUploadResponse
    } catch (error) {
      logMainError('upload-knowledge-sources', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.knowledge.patch,
    async (
      _,
      {
        url,
        id,
        entries,
        updatedAt
      }: { url: string; id: string; entries: KnowledgeEntry[]; updatedAt: string }
    ) => {
      try {
        const response = await netFetch(endpoint(url, `/sources/${encodeURIComponent(id)}`), {
          session: session.fromPartition(partition),
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries, updatedAt })
        })
        return (await response.json()) as KnowledgeSourceResponse
      } catch (error) {
        logMainError('patch-knowledge-source', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.knowledge.delete,
    async (_, { url, id }: { url: string; id: string }) => {
      try {
        const response = await netFetch(endpoint(url, `/sources/${encodeURIComponent(id)}`), {
          session: session.fromPartition(partition),
          method: 'DELETE'
        })
        return response.ok
      } catch (error) {
        logMainError('delete-knowledge-source', error)
        return false
      }
    }
  )

  ipcMain.handle(
    IpcChannel.knowledge.download,
    async (_, { url, id, originalName }: { url: string; id: string; originalName: string }) => {
      const win = windowForDialog()
      const target = win
        ? await dialog.showSaveDialog(win, { defaultPath: originalName })
        : await dialog.showSaveDialog({ defaultPath: originalName })
      if (target.canceled || !target.filePath) return false
      try {
        const response = await netFetch(
          endpoint(url, `/sources/${encodeURIComponent(id)}/download`),
          { session: session.fromPartition(partition) }
        )
        if (!response.ok) return false
        await writeFile(target.filePath, new Uint8Array(await response.arrayBuffer()))
        return true
      } catch (error) {
        logMainError('download-knowledge-source', error)
        return false
      }
    }
  )

  ipcMain.handle(IpcChannel.knowledge.builds, async (_, { url }: { url: string }) => {
    try {
      const response = await netFetch(endpoint(url, '/builds'), {
        session: session.fromPartition(partition)
      })
      return (await response.json()) as KnowledgeBuildsResponse
    } catch (error) {
      logMainError('get-knowledge-builds', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.knowledge.rebuild, async (_, { url }: { url: string }) => {
    try {
      const response = await netFetch(endpoint(url, '/builds'), {
        session: session.fromPartition(partition),
        method: 'POST'
      })
      return (await response.json()) as KnowledgeBuildResponse
    } catch (error) {
      logMainError('rebuild-knowledge', error)
      return null
    }
  })
}

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { BrowserWindow, dialog, ipcMain, session } from 'electron'

import type {
  AdminUserMutationResponse,
  AdminUserProfileMutationResponse,
  AdminUsersResponse,
  DeleteAdminUserProfileResponse,
  DeleteAdminUserResponse,
  GetAvatarPayload,
  ImportAdminUsersResponse,
  PatchMyPreferencesPayload,
  PatchMyPreferencesResponse,
  PatchAdminUserPayload,
  PatchAdminUserProfilePayload,
  SaveAdminUserPayload,
  SaveAdminUserProfilePayload,
  UploadMyAvatarPayload,
  UploadMyAvatarResponse,
  UsersListResponse
} from '../../../src/shared/types/users'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'
import { loadPickedAvatar } from './load-picked-avatar'

/**
 * Registers desktop users IPC handlers.
 */
export function registerUsersHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.users.list, async (_, { url }: { url: string }) => {
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(`${url}/desktop/users`, {
        session: ses
      })
      if (!resp.ok) return null
      return (await resp.json()) as UsersListResponse
    } catch (error) {
      logMainError('get-users', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.users.adminList, async (_, { url }: { url: string }) => {
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(`${url.replace(/\/$/, '')}/desktop/admin/users`, {
        session: ses
      })
      return (await resp.json()) as AdminUsersResponse
    } catch (error) {
      logMainError('get-admin-users', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.users.adminCreate, async (_, params: SaveAdminUserPayload) => {
    const { url, ...body } = params
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(`${url.replace(/\/$/, '')}/desktop/admin/users`, {
        session: ses,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      return (await resp.json()) as AdminUserMutationResponse
    } catch (error) {
      logMainError('create-admin-user', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.users.adminPatch, async (_, params: PatchAdminUserPayload) => {
    const { url, email, ...body } = params
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(
        `${url.replace(/\/$/, '')}/desktop/admin/users/${encodeURIComponent(email)}`,
        {
          session: ses,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )
      return (await resp.json()) as AdminUserMutationResponse
    } catch (error) {
      logMainError('patch-admin-user', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.users.adminDelete,
    async (_, { url, email }: { url: string; email: string }) => {
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(
          `${url.replace(/\/$/, '')}/desktop/admin/users/${encodeURIComponent(email)}`,
          { session: ses, method: 'DELETE' }
        )
        return (await resp.json()) as DeleteAdminUserResponse
      } catch (error) {
        logMainError('delete-admin-user', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.users.adminCreateProfile,
    async (_, params: SaveAdminUserProfilePayload) => {
      const { url, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(`${url.replace(/\/$/, '')}/desktop/admin/users/profiles`, {
          session: ses,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        return (await resp.json()) as AdminUserProfileMutationResponse
      } catch (error) {
        logMainError('create-admin-user-profile', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.users.adminPatchProfile,
    async (_, params: PatchAdminUserProfilePayload) => {
      const { url, id, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(
          `${url.replace(/\/$/, '')}/desktop/admin/users/profiles/${encodeURIComponent(id)}`,
          {
            session: ses,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        )
        return (await resp.json()) as AdminUserProfileMutationResponse
      } catch (error) {
        logMainError('patch-admin-user-profile', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.users.adminDeleteProfile,
    async (_, { url, id }: { url: string; id: string }) => {
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(
          `${url.replace(/\/$/, '')}/desktop/admin/users/profiles/${encodeURIComponent(id)}`,
          { session: ses, method: 'DELETE' }
        )
        return (await resp.json()) as DeleteAdminUserProfileResponse
      } catch (error) {
        logMainError('delete-admin-user-profile', error)
        return null
      }
    }
  )

  ipcMain.handle(IpcChannel.users.adminImportCsv, async (_, { url }: { url: string }) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: 'Importer des utilisateurs',
          properties: ['openFile'],
          filters: [{ name: 'CSV', extensions: ['csv'] }]
        })
      : await dialog.showOpenDialog({
          title: 'Importer des utilisateurs',
          properties: ['openFile'],
          filters: [{ name: 'CSV', extensions: ['csv'] }]
        })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null

    const ses = session.fromPartition(partition)
    try {
      const bytes = await readFile(path)
      const form = new FormData()
      form.set('file', new File([bytes], basename(path), { type: 'text/csv' }))
      const resp = await netFetch(`${url.replace(/\/$/, '')}/desktop/admin/users/import`, {
        session: ses,
        method: 'POST',
        body: form
      })
      return (await resp.json()) as ImportAdminUsersResponse
    } catch (error) {
      logMainError('import-admin-users-csv', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.users.patchPreferences,
    async (_, params: PatchMyPreferencesPayload) => {
      const { url, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(`${url.replace(/\/$/, '')}/desktop/me/preferences`, {
          session: ses,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!resp.ok) {
          logMainError('patch-my-preferences', new Error(`${resp.status} ${await resp.text()}`))
          return null
        }
        return (await resp.json()) as PatchMyPreferencesResponse
      } catch (error) {
        logMainError('patch-my-preferences', error)
        return null
      }
    }
  )

  ipcMain.handle(IpcChannel.users.getAvatar, async (_, params: GetAvatarPayload) => {
    const ses = session.fromPartition(partition)
    try {
      const resp = await netFetch(
        `${params.url.replace(/\/$/, '')}/desktop/avatars/${encodeURIComponent(params.email)}`,
        { session: ses }
      )
      if (!resp.ok) return null
      return await resp.arrayBuffer()
    } catch (error) {
      logMainError('get-avatar', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.users.pickAvatar, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const options = {
      title: 'Choisir une photo',
      properties: ['openFile'] as Array<'openFile'>,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    try {
      return await loadPickedAvatar(result.filePaths[0])
    } catch (error) {
      logMainError('pick-avatar', error)
      throw error
    }
  })

  ipcMain.handle(IpcChannel.users.uploadAvatar, async (_, params: UploadMyAvatarPayload) => {
    const ses = session.fromPartition(partition)
    try {
      const bytes = new Uint8Array(params.buffer)
      const formData = new FormData()
      formData.set(
        'avatar',
        new File([bytes], params.name || 'avatar.webp', {
          type: params.type || 'image/webp'
        })
      )
      const resp = await netFetch(`${params.url.replace(/\/$/, '')}/desktop/me/avatar`, {
        session: ses,
        method: 'POST',
        body: formData
      })
      if (!resp.ok) {
        logMainError('upload-avatar', new Error(`${resp.status} ${await resp.text()}`))
        return null
      }
      return (await resp.json()) as UploadMyAvatarResponse
    } catch (error) {
      logMainError('upload-avatar', error)
      return null
    }
  })
}

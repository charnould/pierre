import { ipcMain } from 'electron'

import {
  type CreateIntakePayload,
  type DownloadIntakeFilePayload,
  type ExportIntakeZipPayload,
  INTAKE_LIFECYCLE_ACTIONS,
  type IntakeActionPayload,
  type IntakeRecord,
  type ListIntakesParams,
  type PatchIntakePayload,
  type RunIntakeActionPayload
} from '../../../src/shared/types/intakes'
import { IpcChannel } from '../channels'
import { downloadBinary } from '../download-binary'
import { ipcJsonRequest, joinServerUrl } from '../http-json'

const INTAKE_LIFECYCLE_ACTION_SET = new Set<string>(INTAKE_LIFECYCLE_ACTIONS)

export function registerIntakesHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.intakes.list, async (_, params: ListIntakesParams) => {
    const res = await ipcJsonRequest<{ data: IntakeRecord[] }>(
      partition,
      joinServerUrl(params.url, '/intakes'),
      'GET',
      'get-intakes'
    )
    return res && 'data' in res ? res : null
  })

  ipcMain.handle(IpcChannel.intakes.create, async (_, params: CreateIntakePayload) => {
    const { url, ...body } = params
    return ipcJsonRequest<{ data: IntakeRecord }>(
      partition,
      joinServerUrl(url, '/intakes'),
      'POST',
      'create-intake',
      body
    )
  })

  ipcMain.handle(IpcChannel.intakes.patch, async (_, params: PatchIntakePayload) => {
    return ipcJsonRequest<{ data: IntakeRecord }>(
      partition,
      joinServerUrl(params.url, `/intakes/${encodeURIComponent(params.id)}`),
      'PATCH',
      'patch-intake',
      params.patch
    )
  })

  ipcMain.handle(IpcChannel.intakes.delete, async (_, params: IntakeActionPayload) => {
    return ipcJsonRequest<{ data: { deleted: true } }>(
      partition,
      joinServerUrl(params.url, `/intakes/${encodeURIComponent(params.id)}`),
      'DELETE',
      'delete-intake'
    )
  })

  ipcMain.handle(IpcChannel.intakes.action, async (_, params: RunIntakeActionPayload) => {
    if (!INTAKE_LIFECYCLE_ACTION_SET.has(params.action)) {
      return { error: { code: 'invalid_action', message: 'Action de collecte inconnue' } }
    }
    return ipcJsonRequest<{ data: IntakeRecord }>(
      partition,
      joinServerUrl(params.url, `/intakes/${encodeURIComponent(params.id)}/${params.action}`),
      'POST',
      `${params.action}-intake`
    )
  })

  ipcMain.handle(IpcChannel.intakes.exportZip, async (_, params: ExportIntakeZipPayload) => {
    return downloadBinary({
      partition,
      url: joinServerUrl(params.url, `/intakes/${encodeURIComponent(params.id)}/export.zip`),
      fallbackFilename: params.suggestedFilename ?? 'collecte.zip',
      fallbackError: 'Téléchargement impossible',
      label: 'export-intake-zip'
    })
  })

  ipcMain.handle(IpcChannel.intakes.downloadFile, async (_, params: DownloadIntakeFilePayload) => {
    return downloadBinary({
      partition,
      url: joinServerUrl(
        params.url,
        `/intakes/${encodeURIComponent(params.id)}/submissions/${encodeURIComponent(params.submissionId)}/files/${encodeURIComponent(params.filename)}`
      ),
      fallbackFilename: params.filename,
      fallbackError: 'Téléchargement impossible',
      label: 'download-intake-file'
    })
  })
}

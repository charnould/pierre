import { ipcMain } from 'electron'

import type {
  AutomationResponse,
  AutomationsListResponse,
  CreateAutomationPayload,
  DeleteAutomationPayload,
  DeleteAutomationResponse,
  ListAutomationsParams,
  PatchAutomationPayload,
  PinAutomationPayload,
  RunAutomationPayload
} from '../../../src/shared/types/automations'
import { IpcChannel } from '../channels'
import { ipcJsonRequest, joinServerUrl } from '../http-json'

export function registerAutomationsHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.automations.list, async (_, params: ListAutomationsParams) => {
    const res = await ipcJsonRequest<AutomationsListResponse>(
      partition,
      joinServerUrl(params.url, '/automations'),
      'GET',
      'get-automations'
    )
    return res && 'data' in res ? res : null
  })

  ipcMain.handle(IpcChannel.automations.create, async (_, params: CreateAutomationPayload) => {
    const { url, ...body } = params
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(url, '/automations'),
      'POST',
      'post-automation',
      body
    )
  })

  ipcMain.handle(IpcChannel.automations.patch, async (_, params: PatchAutomationPayload) => {
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}`),
      'PATCH',
      'patch-automation',
      params.patch
    )
  })

  ipcMain.handle(IpcChannel.automations.delete, async (_, params: DeleteAutomationPayload) => {
    return ipcJsonRequest<DeleteAutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}`),
      'DELETE',
      'delete-automation'
    )
  })

  ipcMain.handle(IpcChannel.automations.run, async (_, params: RunAutomationPayload) => {
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}/run`),
      'POST',
      'post-automation'
    )
  })

  ipcMain.handle(IpcChannel.automations.stopRun, async (_, params: RunAutomationPayload) => {
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}/run`),
      'DELETE',
      'delete-automation'
    )
  })

  ipcMain.handle(IpcChannel.automations.pin, async (_, params: PinAutomationPayload) => {
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}/pin`),
      'POST',
      'post-automation'
    )
  })

  ipcMain.handle(IpcChannel.automations.unpin, async (_, params: PinAutomationPayload) => {
    return ipcJsonRequest<AutomationResponse>(
      partition,
      joinServerUrl(params.url, `/automations/${encodeURIComponent(params.id)}/pin`),
      'DELETE',
      'delete-automation'
    )
  })
}

import { ipcMain, session } from 'electron'

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
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

export function registerAutomationsHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.automations.list, async (_, params: ListAutomationsParams) => {
    try {
      const response = await netFetch(`${params.url}/desktop/automations`, {
        session: session.fromPartition(partition)
      })
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
      return (await response.json()) as AutomationsListResponse
    } catch (error) {
      logMainError('get-automations', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.automations.create, async (_, params: CreateAutomationPayload) => {
    const { url, ...body } = params
    return request<AutomationResponse>(partition, `${url}/desktop/automations`, 'POST', body)
  })

  ipcMain.handle(IpcChannel.automations.patch, async (_, params: PatchAutomationPayload) => {
    return request<AutomationResponse>(
      partition,
      `${params.url}/desktop/automations/${encodeURIComponent(params.id)}`,
      'PATCH',
      params.patch
    )
  })

  ipcMain.handle(IpcChannel.automations.delete, async (_, params: DeleteAutomationPayload) => {
    return request<DeleteAutomationResponse>(
      partition,
      `${params.url}/desktop/automations/${encodeURIComponent(params.id)}`,
      'DELETE'
    )
  })

  ipcMain.handle(IpcChannel.automations.run, async (_, params: RunAutomationPayload) => {
    return request<AutomationResponse>(
      partition,
      `${params.url}/desktop/automations/${encodeURIComponent(params.id)}/run`,
      'POST'
    )
  })

  ipcMain.handle(IpcChannel.automations.pin, async (_, params: PinAutomationPayload) => {
    return request<AutomationResponse>(
      partition,
      `${params.url}/desktop/automations/${encodeURIComponent(params.id)}/pin`,
      'POST'
    )
  })

  ipcMain.handle(IpcChannel.automations.unpin, async (_, params: PinAutomationPayload) => {
    return request<AutomationResponse>(
      partition,
      `${params.url}/desktop/automations/${encodeURIComponent(params.id)}/pin`,
      'DELETE'
    )
  })
}

async function request<T>(
  partition: string,
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T | null> {
  try {
    const response = await netFetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      session: session.fromPartition(partition)
    })
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
    return (await response.json()) as T
  } catch (error) {
    logMainError(`${method.toLowerCase()}-automation`, error)
    return null
  }
}

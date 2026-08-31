import { ipcMain, session } from 'electron'

import type {
  BulkOperationExecuteResponse,
  BulkOperationReportsResponse,
  BulkOperationPreviewMessageResponse,
  BulkOperationPreviewQueryResponse,
  BulkOperationResponse,
  BulkOperationsListResponse,
  CreateBulkOperationPayload,
  DeleteBulkOperationPayload,
  ExecuteBulkOperationPayload,
  GetBulkOperationParams,
  ListBulkOperationsParams,
  ListBulkOperationReportsParams,
  PatchBulkOperationPayload,
  PreviewBulkOperationMessagePayload,
  PreviewBulkOperationQueryPayload
} from '../../../src/shared/types/bulk-operations'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

export function registerBulkOperationsHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.bulkOperations.list, async (_, params: ListBulkOperationsParams) => {
    try {
      const response = await netFetch(`${params.url}/desktop/bulk-operations`, {
        session: session.fromPartition(partition)
      })
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
      return (await response.json()) as BulkOperationsListResponse
    } catch (error) {
      logMainError('get-bulk-operations', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.bulkOperations.get, async (_, params: GetBulkOperationParams) => {
    try {
      const response = await netFetch(
        `${params.url}/desktop/bulk-operations/${encodeURIComponent(params.id)}`,
        { session: session.fromPartition(partition) }
      )
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
      return (await response.json()) as BulkOperationResponse
    } catch (error) {
      logMainError('get-bulk-operation', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.bulkOperations.create,
    async (_, params: CreateBulkOperationPayload) => {
      const { url, ...body } = params
      return request<BulkOperationResponse>(
        partition,
        `${url}/desktop/bulk-operations`,
        'POST',
        body
      )
    }
  )

  ipcMain.handle(IpcChannel.bulkOperations.patch, async (_, params: PatchBulkOperationPayload) => {
    return request<BulkOperationResponse>(
      partition,
      `${params.url}/desktop/bulk-operations/${encodeURIComponent(params.id)}`,
      'PATCH',
      params.patch
    )
  })

  ipcMain.handle(
    IpcChannel.bulkOperations.delete,
    async (_, params: DeleteBulkOperationPayload) => {
      return request<BulkOperationResponse>(
        partition,
        `${params.url}/desktop/bulk-operations/${encodeURIComponent(params.id)}`,
        'DELETE'
      )
    }
  )

  ipcMain.handle(
    IpcChannel.bulkOperations.execute,
    async (_, params: ExecuteBulkOperationPayload) => {
      return request<BulkOperationExecuteResponse>(
        partition,
        `${params.url}/desktop/bulk-operations/${encodeURIComponent(params.id)}/execute`,
        'POST',
        { mode: params.mode, clientCommandId: params.clientCommandId }
      )
    }
  )

  ipcMain.handle(
    IpcChannel.bulkOperations.reports,
    async (_, params: ListBulkOperationReportsParams) => {
      try {
        const response = await netFetch(
          `${params.url}/desktop/bulk-operations/${encodeURIComponent(params.id)}/reports`,
          { session: session.fromPartition(partition) }
        )
        if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
        return (await response.json()) as BulkOperationReportsResponse
      } catch (error) {
        logMainError('get-bulk-operation-reports', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.bulkOperations.previewQuery,
    async (_, params: PreviewBulkOperationQueryPayload) => {
      const { url, ...body } = params
      return request<BulkOperationPreviewQueryResponse>(
        partition,
        `${url}/desktop/bulk-operations/preview-query`,
        'POST',
        body
      )
    }
  )

  ipcMain.handle(
    IpcChannel.bulkOperations.previewMessage,
    async (_, params: PreviewBulkOperationMessagePayload) => {
      const { url, ...body } = params
      return request<BulkOperationPreviewMessageResponse>(
        partition,
        `${url}/desktop/bulk-operations/preview-message`,
        'POST',
        body
      )
    }
  )
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
    logMainError(`${method.toLowerCase()}-bulk-operation`, error)
    return null
  }
}

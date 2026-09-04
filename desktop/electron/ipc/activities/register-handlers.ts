import { ipcMain, session } from 'electron'

import type {
  ActivitiesListResponse,
  ActivityFeedSyncData,
  ActivityFeedSyncResult,
  ActivityResponse,
  CreateActivityPayload,
  DeleteActivityPayload,
  DeleteActivityResponse,
  GetActivitiesParams,
  GetActivityFeedSyncParams,
  PatchActivityPayload,
  RecordExternalCommunicationPayload,
  SendCommunicationPayload
} from '../../../src/shared/types/activites'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'
import { activityQueryString } from './query-string'

export function registerActivitiesHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.activities.list, async (_, params: GetActivitiesParams) => {
    const ses = session.fromPartition(partition)
    const search = activityQueryString(params)
    try {
      const response = await netFetch(
        `${params.url}/desktop/activities${search ? `?${search}` : ''}`,
        { session: ses }
      )
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
      return (await response.json()) as ActivitiesListResponse
    } catch (error) {
      logMainError('get-activities', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.activities.syncFeed,
    async (_, params: GetActivityFeedSyncParams): Promise<ActivityFeedSyncResult | null> => {
      const query = new URLSearchParams({
        auteurs: params.auteurs.join(','),
        unread_only: String(params.unread_only),
        inbox_limit: String(params.inbox_limit),
        authored_limit: String(params.authored_limit)
      })
      try {
        const response = await netFetch(`${params.url}/desktop/activity-feed/sync?${query}`, {
          session: session.fromPartition(partition),
          headers: params.etag ? { 'If-None-Match': params.etag } : undefined
        })
        const etag = response.headers.get('etag') ?? ''
        if (response.status === 304) return { notModified: true, etag: etag || params.etag || '' }
        if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
        const body = (await response.json()) as { data: ActivityFeedSyncData }
        return { notModified: false, etag, data: body.data }
      } catch (error) {
        logMainError('sync-activity-feed', error)
        return null
      }
    }
  )

  ipcMain.handle(IpcChannel.activities.create, async (_, params: CreateActivityPayload) => {
    const { url, ...body } = params
    return request<ActivityResponse>(partition, `${url}/desktop/activities`, 'POST', body)
  })

  ipcMain.handle(
    IpcChannel.activities.recordExternalCommunication,
    async (_, params: RecordExternalCommunicationPayload) => {
      const { url, idempotencyKey, ...body } = params
      try {
        const response = await netFetch(`${url}/communications/external`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(body),
          session: session.fromPartition(partition)
        })
        if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
        if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
          throw new Error(
            `${response.status} Serveur incompatible : réponse non JSON de /communications/external`
          )
        }
        return (await response.json()) as ActivityResponse
      } catch (error) {
        logMainError('record-external-communication', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.activities.sendCommunication,
    async (_, params: SendCommunicationPayload) => {
      const { url, idempotencyKey, type, ...body } = params
      try {
        const response = await netFetch(`${url}/${type}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(body),
          session: session.fromPartition(partition)
        })
        if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
        return (await response.json()) as ActivityResponse
      } catch (error) {
        logMainError('send-communication', error)
        return null
      }
    }
  )

  ipcMain.handle(IpcChannel.activities.patch, async (_, params: PatchActivityPayload) => {
    return request<ActivityResponse>(
      partition,
      `${params.url}/desktop/activities/${encodeURIComponent(params.id)}`,
      'PATCH',
      params.patch
    )
  })

  ipcMain.handle(IpcChannel.activities.delete, async (_, params: DeleteActivityPayload) => {
    return request<DeleteActivityResponse>(
      partition,
      `${params.url}/desktop/activities/${encodeURIComponent(params.id)}`,
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
    const responseText = await response.text()
    if (!response.ok) throw new Error(`${response.status} ${responseText}`)
    return JSON.parse(responseText) as T
  } catch (error) {
    logMainError(`${method.toLowerCase()}-activity`, error)
    return null
  }
}

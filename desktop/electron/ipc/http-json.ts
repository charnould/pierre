import { session } from 'electron'

import type { IpcApiError } from '../../src/shared/types/ipc'
import { netFetch } from '../lib/net-fetch'
import { logMainError } from '../services/logging'

export function joinServerUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

export function parseApiError(payload: string): IpcApiError | null {
  try {
    const parsed = JSON.parse(payload) as { error?: { code?: unknown; message?: unknown } }
    const message = typeof parsed.error?.message === 'string' ? parsed.error.message.trim() : ''
    const code = typeof parsed.error?.code === 'string' ? parsed.error.code : 'error'
    return message ? { error: { code, message } } : null
  } catch {
    return null
  }
}

export async function ipcJsonRequest<T>(
  partition: string,
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  label: string,
  body?: unknown
): Promise<T | IpcApiError | null> {
  try {
    const response = await netFetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      session: session.fromPartition(partition)
    })
    const payload = await response.text()
    if (!response.ok) {
      logMainError(label, new Error(`${response.status} ${payload}`))
      return parseApiError(payload)
    }
    return JSON.parse(payload) as T
  } catch (error) {
    logMainError(label, error)
    return null
  }
}

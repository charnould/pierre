import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

import { BrowserWindow, dialog, type FileFilter, session } from 'electron'

import type { BinaryDownloadResult } from '../../src/shared/types/ipc'
import { netFetch } from '../lib/net-fetch'
import { logMainError } from '../services/logging'
import { parseApiError } from './http-json'

type DownloadBinaryOptions = {
  partition: string
  url: string
  method?: 'GET' | 'POST'
  body?: unknown
  fallbackFilename: string
  fallbackError: string
  label: string
  filters?: FileFilter[]
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '')?.[1]
  if (!encoded) return fallback
  try {
    return decodeURIComponent(encoded) || fallback
  } catch {
    return fallback
  }
}

export async function downloadBinary({
  partition,
  url,
  method = 'GET',
  body,
  fallbackFilename,
  fallbackError,
  label,
  filters
}: DownloadBinaryOptions): Promise<BinaryDownloadResult | null> {
  try {
    const response = await netFetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      session: session.fromPartition(partition)
    })
    const type = response.headers.get('content-type') ?? ''
    if (type.includes('application/json') || !response.ok) {
      const payload = await response.text()
      if (!response.ok) {
        logMainError(label, new Error(`${response.status} ${payload}`))
      }
      return parseApiError(payload) ?? { error: { message: fallbackError } }
    }
    const stream = response.body
    if (!stream) return { error: { message: fallbackError } }

    const filename = filenameFromDisposition(
      response.headers.get('content-disposition'),
      fallbackFilename
    )
    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const options = { defaultPath: filename, ...(filters ? { filters } : {}) }
    const picked = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)
    if (picked.canceled || !picked.filePath) {
      await stream.cancel()
      return { canceled: true }
    }
    await pipeline(
      Readable.fromWeb(stream as unknown as NodeReadableStream<Uint8Array>),
      createWriteStream(picked.filePath)
    )
    return { saved: true }
  } catch (error) {
    logMainError(label, error)
    return null
  }
}

import { ipcMain, session } from 'electron'

import type {
  LedgerQueryParams,
  RepaymentTimelineQueryParams
} from '../../../src/shared/types/ledger'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

function ledgerSearch(params: LedgerQueryParams): string {
  const { limit, offset, sort, filters } = params
  const search = new URLSearchParams()
  if (limit !== undefined) search.set('limit', String(limit))
  if (offset !== undefined) search.set('offset', String(offset))
  if (sort) search.set('sort', sort)
  if (filters) {
    for (const [key, values] of Object.entries(filters)) {
      for (const value of values) {
        const trimmed = value.trim()
        if (trimmed) search.append(key, trimmed)
      }
    }
  }
  return search.toString()
}

/**
 * Registers desktop ledger list IPC handler.
 */
export function registerLedgerHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.ledger.list, async (_, params: LedgerQueryParams) => {
    const { url } = params
    const ses = session.fromPartition(partition)
    const qs = ledgerSearch(params)
    try {
      const resp = await netFetch(`${url}/ledger${qs ? `?${qs}` : ''}`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-ledger', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.ledger.meta, async (_, params: LedgerQueryParams) => {
    const ses = session.fromPartition(partition)
    const qs = ledgerSearch(params)
    try {
      const resp = await netFetch(`${params.url}/ledger/meta${qs ? `?${qs}` : ''}`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-ledger-meta', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.ledger.repaymentTimeline,
    async (_, params: RepaymentTimelineQueryParams) => {
      const search = new URLSearchParams({ id_locataire: params.id_locataire })
      try {
        const response = await netFetch(`${params.url}/repayment?${search.toString()}`, {
          session: session.fromPartition(partition)
        })
        if (!response.ok) return null
        return await response.json()
      } catch (error) {
        logMainError('get-repayment-timeline', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.ledger.exportRepaymentDocument,
    async (
      _,
      params: {
        url: string
        document: 'diagnostic' | 'plan' | 'protocole'
        format: 'docx' | 'pdf'
        dossier: unknown
      }
    ) => {
      try {
        const response = await netFetch(`${params.url.replace(/\/$/, '')}/repayment/documents`, {
          session: session.fromPartition(partition),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: params.document,
            format: params.format,
            dossier: params.dossier
          })
        })
        const type = response.headers.get('content-type') ?? ''
        if (type.includes('application/json') || !response.ok) {
          return (await response.json()) as { error?: { message?: string } }
        }
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(
          response.headers.get('content-disposition') ?? ''
        )?.[1]
        return {
          bytes: await response.arrayBuffer(),
          filename: encoded ? decodeURIComponent(encoded) : `document.${params.format}`,
          mimeType: type
        }
      } catch (error) {
        logMainError('export-repayment-document', error)
        return null
      }
    }
  )
}

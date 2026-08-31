import { ipcMain, session } from 'electron'

import type {
  LedgerQueryParams,
  RepaymentTimelineQueryParams
} from '../../../src/shared/types/ledger'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

/**
 * Registers desktop ledger list IPC handler.
 */
export function registerLedgerHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.ledger.list, async (_, params: LedgerQueryParams) => {
    const { url, limit, offset, sort, filters } = params
    const ses = session.fromPartition(partition)
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

    const qs = search.toString()
    try {
      const resp = await netFetch(`${url}/desktop/ledger${qs ? `?${qs}` : ''}`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-ledger', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.ledger.repaymentTimeline,
    async (_, params: RepaymentTimelineQueryParams) => {
      const search = new URLSearchParams({ id_locataire: params.id_locataire })
      try {
        const response = await netFetch(
          `${params.url}/desktop/repayment/timeline?${search.toString()}`,
          { session: session.fromPartition(partition) }
        )
        if (!response.ok) return null
        return await response.json()
      } catch (error) {
        logMainError('get-repayment-timeline', error)
        return null
      }
    }
  )
}

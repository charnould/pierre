import { ipcMain, net, session } from 'electron'

import type { PutTicketDraftPayload } from '../../../src/shared/types/ticket-draft'
import type { PutTicketPayload } from '../../../src/shared/types/tickets'
import type { TicketsQueryParams } from '../../../src/shared/types/tickets'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

/**
 * Registers desktop tickets list and facet IPC handlers.
 */
export function registerTicketsHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.tickets.list, async (_, params: TicketsQueryParams) => {
    const { url, filters, filter_rules, limit, offset, sort } = params
    const ses = session.fromPartition(partition)
    const search = new URLSearchParams()
    if (limit !== undefined) search.set('limit', String(limit))
    if (offset !== undefined) search.set('offset', String(offset))
    if (sort) search.set('sort', sort)
    if (filters) {
      for (const [key, values] of Object.entries(filters)) {
        for (const value of values) {
          if (value !== undefined && value !== null && value !== '') {
            search.append(key, String(value))
          }
        }
      }
    }
    if (filter_rules && filter_rules.length > 0) {
      search.set('rules', JSON.stringify(filter_rules))
    }

    const qs = search.toString()
    try {
      const resp = await net.fetch(`${url}/desktop/tickets${qs ? `?${qs}` : ''}`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-tickets', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.tickets.facets, async (_, { url, column, q }) => {
    const ses = session.fromPartition(partition)
    const search = new URLSearchParams({ column })
    if (q) search.set('q', q)
    try {
      const resp = await net.fetch(`${url}/desktop/tickets/facets?${search.toString()}`, {
        session: ses
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-ticket-facets', error)
      return null
    }
  })

  ipcMain.handle(
    IpcChannel.tickets.putDraft,
    async (_, params: { url: string } & PutTicketDraftPayload) => {
      const { url, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await net.fetch(`${url}/desktop/tickets/drafts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          session: ses
        })
        if (!resp.ok) return null
        return await resp.json()
      } catch (error) {
        logMainError('put-ticket-draft', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.tickets.putTicket,
    async (_, params: { url: string } & PutTicketPayload) => {
      const { url, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await net.fetch(`${url}/desktop/tickets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          session: ses
        })
        if (!resp.ok) return null
        return await resp.json()
      } catch (error) {
        logMainError('put-ticket', error)
        return null
      }
    }
  )

  ipcMain.handle(
    IpcChannel.tickets.getDraft,
    async (_, params: { url: string; id_reclamation: string; id_skill?: string }) => {
      const { url, id_reclamation, id_skill } = params
      const ses = session.fromPartition(partition)
      const search = new URLSearchParams({ id_reclamation })
      if (id_skill) search.set('id_skill', id_skill)
      try {
        const resp = await net.fetch(`${url}/desktop/tickets/drafts?${search.toString()}`, {
          session: ses
        })
        if (!resp.ok) return null
        return await resp.json()
      } catch (error) {
        logMainError('get-ticket-draft', error)
        return null
      }
    }
  )
}

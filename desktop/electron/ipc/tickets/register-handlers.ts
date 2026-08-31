import { ipcMain, session } from 'electron'

import type { Activite } from '../../../src/shared/types/activites'
import { parse_contenu_json } from '../../../src/shared/types/activites'
import type { GetTicketDraftResult, TicketDraft } from '../../../src/shared/types/ticket-draft'
import type { PutTicketPayload } from '../../../src/shared/types/tickets'
import type { TicketsQueryParams } from '../../../src/shared/types/tickets'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { IpcChannel } from '../channels'

const activityToDraft = (activity: Activite): TicketDraft => {
  const metadata = parse_contenu_json(activity.contenu)
  const edition =
    metadata['edition'] && typeof metadata['edition'] === 'object'
      ? (metadata['edition'] as Record<string, unknown>)
      : {}
  const evaluation =
    metadata['evaluation'] && typeof metadata['evaluation'] === 'object'
      ? (metadata['evaluation'] as Record<string, unknown>)
      : {}
  const stringValue = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value : null
  const numberValue = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
  return {
    activity_id: activity.id,
    id_reclamation: activity.rattachement.slice(activity.rattachement.indexOf(':') + 1),
    id_skill: stringValue(metadata['skill']) ?? '',
    channel: stringValue(metadata['canal']) ?? stringValue(metadata['channel']),
    generated_output: stringValue(metadata['contenu_original']),
    generated_reasoning: stringValue(metadata['raisonnement']),
    generated_duration_ms: numberValue(metadata['duree_ms']),
    generated_at: activity.date_creation,
    generated_by: stringValue(metadata['genere_par']) ?? activity.auteur,
    automation_id: stringValue(metadata['automation_id']),
    edited_output: edition['par'] == null ? null : stringValue(metadata['contenu']),
    edited_at: stringValue(edition['le']),
    edited_by: stringValue(edition['par']),
    feedback_rating: numberValue(evaluation['score']),
    feedback_comment: stringValue(evaluation['commentaire']),
    feedback_at: stringValue(evaluation['le']),
    feedback_by: stringValue(evaluation['par'])
  }
}

async function fetchTicketDraftActivities(
  partition: string,
  url: string,
  idReclamation: string
): Promise<Activite[]> {
  const search = new URLSearchParams({
    contexte: 'tickets',
    ref: idReclamation,
    limit: '100'
  })
  const response = await netFetch(`${url}/desktop/activities?${search}`, {
    session: session.fromPartition(partition)
  })
  if (!response.ok) return []
  const body = (await response.json()) as { data?: Activite[] }
  return (body.data ?? []).filter(
    (activity) =>
      activity.statut === 'draft' &&
      ['ticket_memo', 'ticket_summary', 'ticket_reply'].includes(activity.type)
  )
}

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
      const resp = await netFetch(`${url}/desktop/tickets${qs ? `?${qs}` : ''}`, {
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
      const resp = await netFetch(`${url}/desktop/tickets/facets?${search.toString()}`, {
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
    IpcChannel.tickets.putTicket,
    async (_, params: { url: string } & PutTicketPayload) => {
      const { url, ...body } = params
      const ses = session.fromPartition(partition)
      try {
        const resp = await netFetch(`${url}/desktop/tickets`, {
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
      try {
        const drafts = (await fetchTicketDraftActivities(partition, url, id_reclamation)).map(
          activityToDraft
        )
        return {
          data: id_skill ? (drafts.find((draft) => draft.id_skill === id_skill) ?? null) : drafts
        } satisfies GetTicketDraftResult
      } catch (error) {
        logMainError('get-ticket-draft', error)
        return null
      }
    }
  )
}

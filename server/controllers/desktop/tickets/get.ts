import type { Context } from 'hono'

import { parseTicketFilterRules } from '../../../utils/ticket-filters'
import {
  list_tickets,
  parse_tickets_filters,
  TicketsPaginationQuery,
  TicketsQueryError,
  TicketsSchemaError
} from '../../../utils/tickets-query'

/**
 * GET /desktop/tickets
 *
 * Returns a paginated list of tickets from `datastore.sqlite`.
 * Filters and sort columns are validated against the SQLite `reclamations` table schema
 * (`meta.columns` in the response).
 */
export const controller = async (c: Context) => {
  const parsed = TicketsPaginationQuery.safeParse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    sort: c.req.query('sort') || undefined
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ') || 'invalid query'
    return c.json({ error: { code: 'invalid_query', message } }, 400)
  }

  const filters = parse_tickets_filters(new URL(c.req.url).searchParams)
  let filter_rules: ReturnType<typeof parseTicketFilterRules> | undefined
  const raw_rules = c.req.query('rules')
  if (raw_rules !== undefined) {
    try {
      const decoded = JSON.parse(raw_rules)
      if (!Array.isArray(decoded)) throw new Error('rules must be an array')
      filter_rules = parseTicketFilterRules(decoded)
    } catch {
      return c.json(
        { error: { code: 'invalid_query', message: 'rules must be a valid JSON array' } },
        400
      )
    }
  }

  try {
    return c.json(list_tickets({ ...parsed.data, filters, filter_rules }))
  } catch (e) {
    if (e instanceof TicketsQueryError) {
      return c.json({ error: { code: 'invalid_query', message: e.message } }, 400)
    }
    if (e instanceof TicketsSchemaError) {
      console.error('[get.desktop.tickets] Schema error:', e)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table tickets invalide.' } },
        500
      )
    }
    console.error('[get.desktop.tickets] Error:', e)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture des tickets.' } },
      500
    )
  }
}

import type { Context } from 'hono'
import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeAnyModule, authorizeModule } from '../utils/authorize-role'
import { parseTicketFilterRules } from '../utils/ticket-filters'
import {
  get_ticket_column_facets,
  list_tickets,
  parse_tickets_filters,
  TicketsPaginationQuery,
  TicketsQueryError,
  TicketsSchemaError
} from '../utils/tickets-query'

export const listTickets = async (c: Context<AuthEnv>) => {
  const parsed = TicketsPaginationQuery.safeParse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    sort: c.req.query('sort') || undefined,
    bucket: c.req.query('bucket') || undefined
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ') || 'invalid query'
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
    const result = list_tickets({ ...parsed.data, filters, filter_rules })
    return c.json(c.req.path.endsWith('/meta') ? { meta: result.meta } : result)
  } catch (error) {
    if (error instanceof TicketsQueryError) {
      return c.json({ error: { code: 'invalid_query', message: error.message } }, 400)
    }
    if (error instanceof TicketsSchemaError) {
      console.error('[tickets] Schema error:', error)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table tickets invalide.' } },
        500
      )
    }
    console.error('[tickets] Error:', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture des tickets.' } },
      500
    )
  }
}

export const listTicketFacets = async (c: Context<AuthEnv>) => {
  const column = c.req.query('column')?.trim()
  if (!column) {
    return c.json({ error: { code: 'invalid_query', message: 'column is required' } }, 400)
  }

  const q = c.req.query('q')?.trim() || undefined

  try {
    return c.json(get_ticket_column_facets({ column, q }))
  } catch (error) {
    if (error instanceof TicketsQueryError) {
      return c.json({ error: { code: 'invalid_query', message: error.message } }, 400)
    }
    if (error instanceof TicketsSchemaError) {
      console.error('[tickets] Schema error:', error)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table tickets invalide.' } },
        500
      )
    }
    console.error('[tickets] Error:', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture des facettes.' } },
      500
    )
  }
}

export const tickets = new Hono<AuthEnv>()

tickets.get('/facets', authenticate, authorizeModule('tickets'), listTicketFacets)
tickets.get('/meta', authenticate, authorizeAnyModule('tickets', 'automations'), listTickets)
tickets.get('/', authenticate, authorizeModule('tickets'), listTickets)

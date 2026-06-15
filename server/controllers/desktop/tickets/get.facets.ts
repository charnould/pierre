import type { Context } from 'hono'

import {
  get_ticket_column_facets,
  TicketsQueryError,
  TicketsSchemaError
} from '../../../utils/tickets-query'

/**
 * GET /desktop/tickets/facets
 *
 * Returns distinct values for one column from the full tickets dataset.
 */
export const controller = async (c: Context) => {
  const column = c.req.query('column')?.trim()
  if (!column) {
    return c.json({ error: { code: 'invalid_query', message: 'column is required' } }, 400)
  }

  const q = c.req.query('q')?.trim() || undefined

  try {
    return c.json(get_ticket_column_facets({ column, q }))
  } catch (e) {
    if (e instanceof TicketsQueryError) {
      return c.json({ error: { code: 'invalid_query', message: e.message } }, 400)
    }
    if (e instanceof TicketsSchemaError) {
      console.error('[get.desktop.tickets.facets] Schema error:', e)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table tickets invalide.' } },
        500
      )
    }
    console.error('[get.desktop.tickets.facets] Error:', e)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture des facettes.' } },
      500
    )
  }
}

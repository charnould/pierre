import type { Context } from 'hono'
import { z } from 'zod'

import { get_ledger_column_facets } from '../../../utils/ledger/query'
import { LedgerQueryError, LedgerSchemaError } from '../../../utils/ledger/schema'

const FacetsQuery = z
  .object({
    column: z.string().trim().min(1).max(256),
    q: z.string().trim().max(256).optional()
  })
  .strict()

/**
 * GET /desktop/ledger/facets
 *
 * Returns distinct values for one ledger view column (full dataset, not paginated).
 */
export const controller = (c: Context) => {
  const searchParams = new URL(c.req.url).searchParams
  if (
    searchParams.getAll('column').length !== 1 ||
    searchParams.getAll('q').length > 1 ||
    [...searchParams.keys()].some((key) => key !== 'column' && key !== 'q')
  ) {
    return c.json({ error: { code: 'invalid_query', message: 'Invalid facet query' } }, 400)
  }
  const parsed = FacetsQuery.safeParse({
    column: searchParams.get('column'),
    q: searchParams.get('q') || undefined
  })
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_query', message: 'Invalid facet query' } }, 400)
  }

  try {
    return c.json(get_ledger_column_facets(parsed.data))
  } catch (error) {
    if (error instanceof LedgerQueryError) {
      return c.json({ error: { code: 'invalid_query', message: error.message } }, 400)
    }
    if (error instanceof LedgerSchemaError) {
      console.error('[get.desktop.ledger.facets] Schema error:', error)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table ledger invalide.' } },
        500
      )
    }
    console.error('[get.desktop.ledger.facets] Error:', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture des facettes.' } },
      500
    )
  }
}

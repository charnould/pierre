import type { Context } from 'hono'

import { parse_ledger_filters } from '../../../utils/ledger/filters'
import { list_ledger_balances } from '../../../utils/ledger/query'
import {
  LedgerPaginationQuery,
  LedgerQueryError,
  LedgerSchemaError
} from '../../../utils/ledger/schema'

/**
 * GET /desktop/ledger
 *
 * Returns paginated tenant balances aggregated by `id_locataire` from `comptes_locataires`,
 * with occupation / bail from `lots_locatifs` on (id_lot, id_locataire).
 */
export const controller = (c: Context) => {
  const searchParams = new URL(c.req.url).searchParams
  if (['limit', 'offset', 'sort'].some((key) => searchParams.getAll(key).length > 1)) {
    return c.json(
      { error: { code: 'invalid_query', message: 'Pagination parameters must be unique' } },
      400
    )
  }
  const parsed = LedgerPaginationQuery.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    sort: searchParams.get('sort') || undefined
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ') || 'invalid query'
    return c.json({ error: { code: 'invalid_query', message } }, 400)
  }

  const filters = parse_ledger_filters(searchParams)

  try {
    return c.json(list_ledger_balances({ ...parsed.data, filters }))
  } catch (error) {
    if (error instanceof LedgerQueryError) {
      return c.json({ error: { code: 'invalid_query', message: error.message } }, 400)
    }
    if (error instanceof LedgerSchemaError) {
      console.error('[get.desktop.ledger] Schema error:', error)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table ledger invalide.' } },
        500
      )
    }
    console.error('[get.desktop.ledger] Error:', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture du ledger.' } },
      500
    )
  }
}

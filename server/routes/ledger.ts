import type { Context } from 'hono'
import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeAnyModule, authorizeModule } from '../utils/authorize-role'
import { parse_ledger_filters } from '../utils/ledger/filters'
import { list_ledger_balances } from '../utils/ledger/query'
import { LedgerPaginationQuery, LedgerQueryError, LedgerSchemaError } from '../utils/ledger/schema'

export const listLedger = (c: Context<AuthEnv>) => {
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
    const result = list_ledger_balances({ ...parsed.data, filters })
    return c.json(c.req.path.endsWith('/meta') ? { meta: result.meta } : result)
  } catch (error) {
    if (error instanceof LedgerQueryError) {
      return c.json({ error: { code: 'invalid_query', message: error.message } }, 400)
    }
    if (error instanceof LedgerSchemaError) {
      console.error('[ledger] Schema error:', error)
      return c.json(
        { error: { code: 'invalid_schema', message: 'Schema de la table ledger invalide.' } },
        500
      )
    }
    console.error('[ledger] Error:', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Erreur lors de la lecture du ledger.' } },
      500
    )
  }
}

export const ledger = new Hono<AuthEnv>()

ledger.get('/meta', authenticate, authorizeAnyModule('repayment', 'bulk'), listLedger)
ledger.get('/', authenticate, authorizeModule('repayment'), listLedger)

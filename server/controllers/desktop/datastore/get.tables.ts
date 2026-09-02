import type { Context } from 'hono'

import { get_datastore_tables } from '../../../utils/datastore-tables'

/**
 * GET /desktop/datastore/tables
 *
 * Returns whether each canonical datastore table is present in `datastore.sqlite`
 * for the current `SERVICE`.
 *
 * @example Success — `{ tables: [{ name: "reclamations", exists: true }, …] }`
 * @example Failure — `{ error: { code: "internal_error", message: "…" } }` (HTTP 500)
 */
export const controller = (c: Context) => {
  try {
    return c.json(get_datastore_tables())
  } catch (e) {
    console.error('[get.desktop.datastore.tables] Error:', e)
    return c.json(
      {
        error: {
          code: 'internal_error',
          message: 'Erreur lors de la lecture des tables SQLite.'
        }
      },
      500
    )
  }
}

import type { Context } from 'hono'
import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { get_datastore_tables } from '../utils/datastore-tables'

export const listDatastoreTables = (c: Context<AuthEnv>) => {
  try {
    return c.json({ data: get_datastore_tables() })
  } catch (error) {
    console.error('[datastore] Error:', error)
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

export const datastore = new Hono<AuthEnv>()

datastore.get('/', authenticate, listDatastoreTables)

import { Database } from 'bun:sqlite'

import { format } from 'date-fns'
import type { Context } from 'hono'
import { z } from 'zod/v4'

const sql = new Database(`datastores/${Bun.env['SERVICE']}/datastore.sqlite`)

const TelemetryPayload = z.object({
  host: z.string().trim().min(1),
  event: z.string().trim().min(1),
  timestamp: z.string().trim().optional()
})

/**
 * POST /telemetry
 *
 * Public endpoint that receives usage pings from Pierre instances.
 * Stores host, event, and timestamp in the local telemetry table.
 */
export const controller = async (c: Context) => {
  try {
    const body = await c.req.json()
    const payload = TelemetryPayload.safeParse(body)

    if (!payload.success) return c.json({ ok: false }, 400)

    sql.run(`INSERT INTO telemetry (timestamp, host, event) VALUES (?, ?, ?)`, [
      format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      payload.data.host,
      payload.data.event
    ])

    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false }, 500)
  }
}

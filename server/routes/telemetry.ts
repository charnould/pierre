import type { Context } from 'hono'
import { z } from 'zod/v4'

import { openDatastore } from '../utils/datastore-db'
import { persist_telemetry } from '../utils/send-telemetry'

const TelemetryPayload = z.object({
  host: z.string().trim().min(1),
  event: z.string().trim().min(1)
})

/**
 * POST /telemetry
 *
 * Public endpoint that receives usage pings from Pierre instances.
 * Stores host, event, and recorded_at in the local telemetry table.
 */
export const postTelemetry = async (c: Context) => {
  try {
    const body = await c.req.json()
    const payload = TelemetryPayload.safeParse(body)

    if (!payload.success) {
      return c.json({ error: { code: 'invalid_body', message: 'Invalid telemetry body' } }, 400)
    }

    using sql = openDatastore()
    persist_telemetry(sql, payload.data.host, payload.data.event)

    return c.body(null, 204)
  } catch {
    return c.json({ error: { code: 'internal_error', message: 'Internal Server Error' } }, 500)
  }
}

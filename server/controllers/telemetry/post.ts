import { Database } from 'bun:sqlite'

import type { Context } from 'hono'
import { z } from 'zod/v4'

import { datastorePaths } from '../../utils/paths'
import { persist_telemetry } from '../../utils/send-telemetry'

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
export const controller = async (c: Context) => {
  try {
    const body = await c.req.json()
    const payload = TelemetryPayload.safeParse(body)

    if (!payload.success) return c.json({ ok: false }, 400)

    using sql = new Database(datastorePaths().database)
    persist_telemetry(sql, payload.data.host, payload.data.event)

    return c.json({ ok: true })
  } catch {
    return c.json({ ok: false }, 500)
  }
}

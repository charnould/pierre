/**
 * Activity inserts forward telemetry via `fetch`. Keep those pings offline.
 */
import { TELEMETRY_URL } from '../../utils/send-telemetry'

const real_fetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (String(input) === TELEMETRY_URL) return new Response(null, { status: 204 })
    return real_fetch(input, init)
  },
  { preconnect: () => {} }
)

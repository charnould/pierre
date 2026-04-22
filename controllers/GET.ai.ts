import type { Context } from 'hono'
import { stream } from 'hono/streaming'

import { AIContext } from '../utils/_schema'
import { answer_user } from '../utils/generate-answer'
import { save_reply } from '../utils/handle-conversation'

/**
 * Controller for NDJSON streaming with Copilot SDK.
 *
 * Streams response events to the frontend as newline-delimited JSON.
 */
export const controller = async (c: Context) => {
  c.header('Content-Type', 'application/x-ndjson; charset=utf-8')

  try {
    // Parse context from request
    const context = await AIContext.parseAsync({
      config: (await import(`../assets/${c.req.query('config')}/config`)).default,
      custom_data: { raw: c.req.query('data')?.split('|') },
      metadata: { user: c.get('user')?.email ?? null },
      content: c.req.query('message'),
      conv_id: c.req.query('conv_id'),
      role: 'user'
    })

    // Save user's question
    await save_reply(context)

    // Generate answer using Copilot SDK
    return stream(
      c,
      async (s) => {
        const ac = new AbortController()
        s.onAbort(() => {
          console.log('[STREAM] Client disconnected — aborting')
          ac.abort()
        })

        const { textStream } = answer_user(context, ac.signal)
        for await (const chunk of textStream) {
          if (chunk) s.write(chunk)
        }
      },
      async (e, s) => {
        console.error('[STREAM_ERROR]', e)
        s.write(JSON.stringify({ t: 'error', d: {} }) + '\n')
      }
    )
  } catch (e) {
    console.error('[CONTROLLER_ERROR]', e)
    return stream(c, async (s) => {
      s.write(JSON.stringify({ t: 'error', d: {} }) + '\n')
    })
  }
}

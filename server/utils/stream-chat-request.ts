import type { Context } from 'hono'
import { stream } from 'hono/streaming'

import type { AIContext } from './_schema'
import type { PiImageContent, ProcessedPiAttachments } from './ai-attachments'
import { save_reply } from './handle-conversation'
import { streamChatAnswer } from './stream-chat'
import { ndjsonLine } from './stream-to-ndjson'

type StreamChatRequestDependencies = {
  saveReply: typeof save_reply
  streamAnswer: typeof streamChatAnswer
}

const defaultDependencies: StreamChatRequestDependencies = {
  saveReply: save_reply,
  streamAnswer: streamChatAnswer
}

/** Saves a chat turn and streams its canonical NDJSON response for GET and POST /ai. */
export async function streamChatRequest(
  c: Context,
  context: AIContext,
  attachments?: PiImageContent[],
  attachmentLifecycle?: Pick<ProcessedPiAttachments, 'claim' | 'rollback'>,
  dependencies: StreamChatRequestDependencies = defaultDependencies
) {
  c.header('Content-Type', 'application/x-ndjson; charset=utf-8')
  try {
    await dependencies.saveReply(context)
  } catch (error) {
    await attachmentLifecycle?.rollback()
    throw error
  }

  return stream(
    c,
    async (output) => {
      const abortController = new AbortController()
      output.onAbort(() => {
        console.log('[STREAM] Client disconnected — aborting')
        abortController.abort()
      })

      const { textStream } = dependencies.streamAnswer(
        context,
        abortController.signal,
        attachments,
        attachmentLifecycle
      )
      for await (const chunk of textStream) {
        if (chunk) await output.write(chunk)
      }
    },
    async (error, output) => {
      console.error('[STREAM_ERROR]', error)
      await attachmentLifecycle?.rollback()
      await output.write(ndjsonLine({ type: 'error' }))
    }
  )
}

export function streamChatRequestError(c: Context, error: unknown) {
  console.error('[CONTROLLER_ERROR]', error)
  return stream(c, async (output) => {
    await output.write(ndjsonLine({ type: 'error' }))
  })
}

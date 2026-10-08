import { createNdjsonLineBuffer } from '@/shared/lib/ndjson-buffer'

import type { AiStreamEvent } from '../../../../../shared/ai-stream-events'
import { parseAiStreamLine } from '../../../../../shared/ai-stream-events'
import type { ChatQuestionnaireRequest, ChatStreamRequest, ChatTransport } from './chat-transport'

async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AiStreamEvent) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  const lineBuffer = createNdjsonLineBuffer((line) => {
    const event = parseAiStreamLine(line)
    if (event) onEvent(event)
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) lineBuffer.push(decoder.decode(value, { stream: true }))
    }
    const tail = decoder.decode()
    if (tail) lineBuffer.push(tail)
    lineBuffer.flush()
  } catch (error) {
    lineBuffer.clear()
    throw error
  }
}

export function createHttpChatTransport(): ChatTransport {
  return {
    async stream(request: ChatStreamRequest, onEvent, signal) {
      const form = new FormData()
      form.set('configId', request.configId)
      form.set('message', request.message)
      form.set('conversationId', request.convId)
      form.set('data', request.dataParam)
      for (const file of request.files) {
        form.append('files', file)
      }

      const response = await fetch('/chat', { method: 'POST', body: form, signal })
      if (!response.ok || !response.body) {
        throw new Error('Chat stream failed')
      }
      await readNdjsonStream(response.body, onEvent)
    },

    async submitQuestionnaire(request: ChatQuestionnaireRequest) {
      const response = await fetch('/chat/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: request.convId,
          requestId: request.requestId,
          responseSecret: request.responseSecret,
          answers: request.answers
        })
      })
      return response.ok
    }
  }
}

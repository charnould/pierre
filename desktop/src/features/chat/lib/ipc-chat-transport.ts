import { cancelNdjsonStream, runNdjsonStream } from '@/shared/lib/run-ndjson-stream'

import type { ChatQuestionnaireRequest, ChatStreamRequest, ChatTransport } from './chat-transport'

export function createIpcChatTransport(url: string): ChatTransport {
  return {
    async stream(request: ChatStreamRequest, onEvent, signal) {
      const requestId = crypto.randomUUID()
      const abort = () => cancelNdjsonStream(requestId)
      signal.addEventListener('abort', abort)

      try {
        const { ok, cancelled } = await runNdjsonStream({
          requestId,
          start: async (activeRequestId) => {
            const files = await Promise.all(
              request.files.map(async (file) => ({
                name: file.name,
                type: file.type,
                buffer: await file.arrayBuffer()
              }))
            )
            return window.api.startStream({
              requestId: activeRequestId,
              url,
              config: request.configId,
              message: request.message,
              conv_id: request.convId,
              data: request.dataParam,
              files
            })
          },
          isCancelled: () => signal.aborted,
          onEvent
        })

        if (cancelled || signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        if (!ok) {
          throw new Error('Chat stream failed')
        }
      } finally {
        signal.removeEventListener('abort', abort)
      }
    },

    submitQuestionnaire(request: ChatQuestionnaireRequest) {
      return window.api.postAiUiResponse({
        url,
        conv_id: request.convId,
        request_id: request.requestId,
        response_secret: request.responseSecret,
        answers: request.answers
      })
    }
  }
}

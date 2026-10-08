import { ipcMain, type IpcMainInvokeEvent, session } from 'electron'

import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import { aiChunkEventChannel, IpcChannel } from '../channels'
import { createStreamBatcher } from './batcher'
import { beginStream, cancelStream, endStream } from './lifecycle'

type StreamStartParams = {
  requestId: string
  url: string
  config: string
  message: string
  conv_id: string
  data?: string
  files?: Array<{ name: string; type: string; buffer: ArrayBuffer }>
}

type GenerateAnswerParams = {
  requestId: string
  url: string
  conv_id: string
  payload: string
  id_skill: string
  files: Array<{ name: string; type: string; buffer: ArrayBuffer }>
}

type UiResponseParams = {
  url: string
  conv_id: string
  request_id: string
  response_secret: string
  answers: Array<{ question: string; answer: string }>
}

const activeStreams = new Map<string, { requestId: string; controller: AbortController }>()

function emitChunk(event: IpcMainInvokeEvent, requestId: string, chunk: string): void {
  if (!event.sender.isDestroyed()) {
    event.sender.send(aiChunkEventChannel(requestId), chunk)
  }
}

/**
 * Streams an HTTP response body to a request-scoped renderer channel.
 * Chunks are micro-batched to reduce IPC overhead during long streams.
 */
async function streamResponseToRenderer(
  event: IpcMainInvokeEvent,
  requestId: string,
  responsePromise: Promise<Response>,
  signal: AbortSignal
): Promise<boolean> {
  const batcher = createStreamBatcher((chunk) => emitChunk(event, requestId, chunk))

  try {
    const response = await responsePromise
    if (!response.ok || !response.body) {
      batcher.flush()
      emitChunk(event, requestId, JSON.stringify({ type: 'error' }) + '\n')
      return false
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (signal.aborted) {
        batcher.flush()
        return false
      }
      if (value) batcher.push(decoder.decode(value, { stream: true }))
    }

    const tail = decoder.decode()
    if (tail) batcher.push(tail)
    batcher.flush()
    return true
  } catch (error) {
    batcher.flush()
    if (error instanceof Error && error.name === 'AbortError') return false
    logMainError('stream-response', error)
    emitChunk(event, requestId, JSON.stringify({ type: 'error' }) + '\n')
    return false
  }
}

/**
 * Registers chat/workflow stream handlers with per-request isolation.
 */
export function registerStreamHandlers(partition: string): void {
  ipcMain.handle(IpcChannel.stream.start, async (event, params: StreamStartParams) => {
    const controller = beginStream(activeStreams, params.requestId)
    const ses = session.fromPartition(partition)

    try {
      const formData = new FormData()
      formData.set('configId', params.config)
      formData.set('message', params.message)
      formData.set('conversationId', params.conv_id)
      formData.set('data', params.data ?? '')
      for (const file of params.files ?? []) {
        formData.append('files', new Blob([file.buffer], { type: file.type }), file.name)
      }

      return await streamResponseToRenderer(
        event,
        params.requestId,
        netFetch(`${params.url}/chat`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          session: ses
        }),
        controller.signal
      )
    } finally {
      endStream(activeStreams, params.requestId, controller)
    }
  })

  ipcMain.handle(IpcChannel.stream.generateAnswer, async (event, params: GenerateAnswerParams) => {
    const controller = beginStream(activeStreams, params.requestId)
    const ses = session.fromPartition(partition)
    const formData = new FormData()
    formData.set('conversationId', params.conv_id)
    formData.set('payload', params.payload)
    formData.set('skillId', params.id_skill ?? 'answer')

    if (Array.isArray(params.files)) {
      for (const file of params.files) {
        formData.append('files', new Blob([file.buffer], { type: file.type }), file.name)
      }
    }

    try {
      return await streamResponseToRenderer(
        event,
        params.requestId,
        netFetch(`${params.url}/workflows`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          session: ses
        }),
        controller.signal
      )
    } finally {
      endStream(activeStreams, params.requestId, controller)
    }
  })

  ipcMain.handle(IpcChannel.stream.postUiResponse, async (_, params: UiResponseParams) => {
    const ses = session.fromPartition(partition)
    try {
      const response = await netFetch(`${params.url}/chat/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: params.conv_id,
          requestId: params.request_id,
          responseSecret: params.response_secret,
          answers: params.answers
        }),
        session: ses
      })
      return response.ok
    } catch (error) {
      logMainError('post-ai-ui-response', error)
      return false
    }
  })

  ipcMain.handle(IpcChannel.stream.cancel, (_, requestId: string) => {
    cancelStream(activeStreams, requestId)
  })

  ipcMain.handle(
    IpcChannel.stream.releaseConversationVm,
    async (_, params: { url: string; conv_id: string }) => {
      const ses = session.fromPartition(partition)
      try {
        const response = await netFetch(
          `${params.url}/chat/sessions/${encodeURIComponent(params.conv_id)}`,
          {
            method: 'DELETE',
            session: ses
          }
        )
        return response.ok || response.status === 204
      } catch (error) {
        logMainError('release-conversation-vm', error)
        return false
      }
    }
  )
}

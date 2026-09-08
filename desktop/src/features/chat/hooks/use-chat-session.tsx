import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildRegeneratePayload,
  truncateAfterLastUserMessage
} from '@/features/chat/lib/chat-session-messages'
import type {
  ChatAttachment,
  ChatConfig,
  ChatStatus,
  Message,
  PendingQuestionnaire
} from '@/features/chat/lib/chat-session-types'
import { applyChatStreamEvent, sealReasoningDuration } from '@/features/chat/lib/chat-stream-events'
import type { ChatTransport } from '@/features/chat/lib/chat-transport'
import type { AiStreamEvent } from '@/features/workflow/lib/parse-workflow-chunk'
import { createRafThrottle } from '@/shared/lib/raf-throttle'

export type { ChatConfig, ChatStatus, Message } from '@/features/chat/lib/chat-session-types'
export { isChatGenerating } from '@/features/chat/lib/chat-session-types'

const CHAT_STATUS_ANNOUNCEMENT: Record<ChatStatus, string> = {
  ready: '',
  submitted: 'Envoi du message',
  streaming: 'Réponse en cours',
  error: 'La réponse a échoué',
  stopped: 'Réponse interrompue'
}

const CHAT_STREAM_FRAME_MS = 24

type SendMessageOptions = {
  files?: File[]
  reusedAttachments?: ChatAttachment[]
}

function isDeferredStreamEvent(event: AiStreamEvent): boolean {
  return event.type === 'text_delta' || event.type === 'thinking_delta'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * In-memory chat session. Streaming and questionnaire go through `ChatTransport`.
 */
export function useChatSession(config: ChatConfig, transport: ChatTransport) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [pendingQuestionnaire, setPendingQuestionnaire] = useState<PendingQuestionnaire | null>(
    null
  )
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const [attachmentUsage, setAttachmentUsage] = useState({ files: 0, bytes: 0 })
  const statusLiveRegion = (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {CHAT_STATUS_ANNOUNCEMENT[status]}
    </div>
  )
  const messagesRef = useRef<Message[]>([])
  const generatingRef = useRef(false)
  const stoppedByUserRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const streamThrottleRef = useRef<ReturnType<typeof createRafThrottle> | null>(null)
  const configRef = useRef(config)
  const transportRef = useRef(transport)

  useEffect(() => {
    configRef.current = config
    transportRef.current = transport
  })

  useEffect(() => {
    return () => {
      streamThrottleRef.current?.cancel()
      abortRef.current?.abort()
      abortRef.current = null
      generatingRef.current = false
    }
  }, [])

  const clearMessages = useCallback(() => {
    streamThrottleRef.current?.cancel()
    streamThrottleRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
    generatingRef.current = false
    messagesRef.current = []
    setMessages(messagesRef.current)
    setStatus('ready')
    setPendingQuestionnaire(null)
    setQuestionnaireError(null)
    setShowActivity(false)
    setAttachmentUsage({ files: 0, bytes: 0 })
    stoppedByUserRef.current = false
  }, [])

  const sendMessage = useCallback(async (text: string, options: SendMessageOptions = {}) => {
    const files = options.files ?? []
    const reusedAttachments = options.reusedAttachments ?? []
    const trimmed = text.trim()
    if (
      (!trimmed && files.length === 0 && reusedAttachments.length === 0) ||
      generatingRef.current
    ) {
      return
    }
    const attachmentFiles = [...files]
    const attachments =
      attachmentFiles.length > 0
        ? attachmentFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))
        : reusedAttachments

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', contentIndex: 0, text: trimmed }],
      ...(attachments.length > 0
        ? {
            attachments,
            ...(attachmentFiles.length > 0 ? { attachmentFiles } : { attachmentsPersisted: true })
          }
        : {})
    }
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: []
    }
    const initialMessages = [...messagesRef.current, userMsg, assistantMsg]
    messagesRef.current = initialMessages
    setMessages(initialMessages)
    setStatus('submitted')
    setShowActivity(true)

    const reasoningStart = Date.now()
    let streamState = {
      messages: initialMessages,
      reasoningEndedAt: null as number | null
    }
    generatingRef.current = true
    stoppedByUserRef.current = false

    const abort = new AbortController()
    abortRef.current = abort
    let attachmentUsageAcknowledged = false
    const publish = () => {
      if (abortRef.current !== abort) return
      messagesRef.current = streamState.messages
      setMessages(streamState.messages)
    }
    const streamThrottle = createRafThrottle(publish, CHAT_STREAM_FRAME_MS)
    streamThrottleRef.current = streamThrottle
    const { convId, configId, dataParam } = configRef.current

    try {
      await transportRef.current.stream(
        {
          configId,
          convId,
          dataParam,
          message: trimmed,
          files: attachmentFiles
        },
        (event) => {
          if (abortRef.current !== abort) return
          if (event.type === 'attachment_uploads_ready' && attachmentFiles.length > 0) {
            attachmentUsageAcknowledged = true
            if (event.files !== undefined && event.bytes !== undefined) {
              setAttachmentUsage({ files: event.files, bytes: event.bytes })
            }
            streamState.messages = streamState.messages.map((message) =>
              message.id === userMsg.id
                ? { ...message, attachmentFiles: undefined, attachmentsPersisted: true }
                : message
            )
          }
          if (event.type !== 'error') setStatus('streaming')
          if (event.type === 'extension_ui_request') {
            setPendingQuestionnaire({
              requestId: event.requestId,
              toolCallId: event.toolCallId,
              responseSecret: event.responseSecret,
              questions: event.questions
            })
            setQuestionnaireError(null)
            setShowActivity(false)
          } else if (
            event.type === 'text_start' ||
            event.type === 'text_delta' ||
            event.type === 'text_end' ||
            event.type === 'thinking_start' ||
            event.type === 'thinking_delta' ||
            event.type === 'thinking_end' ||
            event.type === 'toolcall_start' ||
            event.type === 'tool_execution_start' ||
            event.type === 'tool_execution_update'
          ) {
            setShowActivity(false)
          } else if (event.type === 'tool_execution_end') {
            setShowActivity(true)
          } else if (
            event.type === 'stream_end' ||
            event.type === 'error' ||
            (event.type === 'message_end' &&
              event.message.content.some(
                (part) => part.type === 'text' && part.text.trim().length > 0
              ))
          ) {
            setShowActivity(false)
          }
          streamState = applyChatStreamEvent(
            streamState.messages,
            event,
            streamState.reasoningEndedAt
          )
          if (isDeferredStreamEvent(event)) {
            streamThrottle.schedule()
          } else if (event.type !== 'extension_ui_request') {
            streamThrottle.flushNow()
          }
          if (event.type === 'error') setStatus('error')
        },
        abort.signal
      )
    } catch (error) {
      if (abortRef.current !== abort) return
      streamThrottle.flushNow()
      streamThrottleRef.current = null
      abortRef.current = null
      generatingRef.current = false
      if (stoppedByUserRef.current || isAbortError(error)) {
        stoppedByUserRef.current = false
        setStatus('stopped')
        setShowActivity(false)
        return
      }
      console.error('[useChatSession] Stream failed', error)
      setStatus('error')
      setShowActivity(false)
      return
    }

    if (abortRef.current !== abort) return

    if (stoppedByUserRef.current) {
      streamThrottle.flushNow()
      streamThrottleRef.current = null
      abortRef.current = null
      generatingRef.current = false
      stoppedByUserRef.current = false
      setStatus('stopped')
      setShowActivity(false)
      return
    }

    setPendingQuestionnaire(null)
    if (attachmentFiles.length > 0) {
      if (!attachmentUsageAcknowledged) {
        setAttachmentUsage((usage) => ({
          files: usage.files + attachmentFiles.length,
          bytes: usage.bytes + attachmentFiles.reduce((total, file) => total + file.size, 0)
        }))
      }
      streamState.messages = streamState.messages.map((message) =>
        message.id === userMsg.id
          ? { ...message, attachmentFiles: undefined, attachmentsPersisted: true }
          : message
      )
    }
    streamState.messages = sealReasoningDuration(
      streamState.messages,
      reasoningStart,
      streamState.reasoningEndedAt,
      false
    )
    streamThrottle.flushNow()
    if (abortRef.current !== abort) return
    streamThrottle.cancel()
    streamThrottleRef.current = null
    abortRef.current = null
    generatingRef.current = false
    setShowActivity(false)
    setStatus((prev) => (prev === 'error' ? 'error' : 'ready'))
  }, [])

  const stop = useCallback(() => {
    stoppedByUserRef.current = true
    setPendingQuestionnaire(null)
    setQuestionnaireError(null)
    streamThrottleRef.current?.flushNow()
    streamThrottleRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
    generatingRef.current = false
    setShowActivity(false)
    setStatus('stopped')
  }, [])

  /** Undo a user-initiated stop when a follow-up action (e.g. profile switch) fails. */
  const resetAfterAbortedStop = useCallback(() => {
    const last = messagesRef.current.at(-1)
    if (last?.role === 'assistant' && last.parts.length === 0) {
      messagesRef.current = messagesRef.current.slice(0, -1)
      setMessages(messagesRef.current)
    }
    setStatus('ready')
    setShowActivity(false)
    stoppedByUserRef.current = false
  }, [])

  const regenerate = useCallback(() => {
    const payload = buildRegeneratePayload(messagesRef.current)
    if (!payload) return

    messagesRef.current = truncateAfterLastUserMessage(messagesRef.current)
    setMessages(messagesRef.current)
    void sendMessage(payload.text, {
      files: payload.files,
      reusedAttachments: payload.attachments
    })
  }, [sendMessage])

  const submitQuestionnaire = useCallback(
    async (answers: Array<{ question: string; answer: string }>) => {
      if (!pendingQuestionnaire) return false
      setQuestionnaireError(null)
      try {
        const accepted = await transportRef.current.submitQuestionnaire({
          convId: configRef.current.convId,
          requestId: pendingQuestionnaire.requestId,
          responseSecret: pendingQuestionnaire.responseSecret,
          answers
        })
        if (accepted) {
          setPendingQuestionnaire(null)
          return true
        }
      } catch (error) {
        console.error('[useChatSession] UI response failed', error)
      }
      setQuestionnaireError("La réponse n'a pas pu être envoyée.")
      return false
    },
    [pendingQuestionnaire]
  )

  return {
    messages,
    attachmentUsage,
    status,
    showActivity,
    statusLiveRegion,
    sendMessage,
    stop,
    regenerate,
    pendingQuestionnaire,
    questionnaireError,
    submitQuestionnaire,
    clearMessages,
    resetAfterAbortedStop
  }
}

import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react'

import { cancelAiStream, runAiStream } from '../lib/run-ai-stream'
import type { AiStreamEvent } from '../workflows/parse-workflow-chunk'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  reasoningDuration?: number
  /** False once content deltas start; true again if reasoning resumes after content. */
  isReasoningPhase?: boolean
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error' | 'stopped'

export type ChatConfig = {
  url: string
  convId: string
  configId: string
  dataParam: string
}

function sealReasoningDuration(
  setMessages: Dispatch<SetStateAction<Message[]>>,
  reasoningStart: number,
  reasoningEndedAt: number | null,
  reasoningSealed: { current: boolean }
) {
  if (reasoningSealed.current) return
  reasoningSealed.current = true
  const end = reasoningEndedAt ?? Date.now()
  const seconds = Math.round((end - reasoningStart) / 1000)
  setMessages((prev) => {
    const updated = [...prev]
    const last = updated[updated.length - 1]
    if (last?.role === 'assistant') {
      updated[updated.length - 1] = {
        ...last,
        reasoningDuration: seconds,
        isReasoningPhase: false
      }
    }
    return updated
  })
}

function applyChatStreamEvent(
  event: AiStreamEvent,
  setMessages: Dispatch<SetStateAction<Message[]>>,
  setStatus: Dispatch<SetStateAction<ChatStatus>>,
  reasoningEndedAt: { current: number | null }
) {
  switch (event.type) {
    case 'reasoning_delta':
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            reasoning: (last.reasoning ?? '') + event.content,
            isReasoningPhase: true
          }
        }
        return updated
      })
      reasoningEndedAt.current = null
      break
    case 'delta':
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          const content = last.content + event.content
          const reasoningEnded = content.trim().length > 0
          if (reasoningEnded && last.isReasoningPhase !== false) {
            reasoningEndedAt.current = Date.now()
          }
          updated[updated.length - 1] = {
            ...last,
            content,
            ...(reasoningEnded ? { isReasoningPhase: false } : {})
          }
        }
        return updated
      })
      break
    case 'reset':
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: '' }
        }
        return updated
      })
      break
    case 'done':
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: event.content }
        }
        return updated
      })
      break
    case 'error':
      setStatus('error')
      break
  }
}

export function usePierreChat(config: ChatConfig) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const stoppedByUserRef = useRef(false)
  const configRef = useRef(config)
  configRef.current = config

  const clearMessages = useCallback(() => {
    setMessages([])
    setStatus('ready')
    stoppedByUserRef.current = false
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isReasoningPhase: true
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStatus('submitted')

    const reasoningStart = Date.now()
    const reasoningEndedAt = { current: null as number | null }
    const reasoningSealed = { current: false }
    stoppedByUserRef.current = false
    setStatus('streaming')

    const { url, convId, configId, dataParam } = configRef.current
    const { ok, cancelled } = await runAiStream({
      start: () =>
        window.api.startStream({
          url,
          config: configId,
          message: text,
          conv_id: convId,
          data: dataParam
        }),
      isCancelled: () => stoppedByUserRef.current,
      onEvent: (event) => applyChatStreamEvent(event, setMessages, setStatus, reasoningEndedAt)
    })

    if (cancelled) {
      stoppedByUserRef.current = false
      setStatus('stopped')
      return
    }

    if (!ok) {
      console.error('[usePierreChat] Stream failed')
      setStatus('error')
      return
    }

    sealReasoningDuration(setMessages, reasoningStart, reasoningEndedAt.current, reasoningSealed)
    setStatus((prev) => (prev === 'error' ? 'error' : 'ready'))
  }, [])

  const stop = useCallback(() => {
    stoppedByUserRef.current = true
    cancelAiStream()
    setStatus('stopped')
  }, [])

  const regenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    setMessages((prev) => {
      const idx = prev.findLastIndex((m) => m.role === 'user')
      return idx >= 0 ? prev.slice(0, idx) : prev
    })

    void sendMessage(lastUserMsg.content)
  }, [messages, sendMessage])

  return { messages, status, sendMessage, stop, regenerate, clearMessages, setMessages, setStatus }
}

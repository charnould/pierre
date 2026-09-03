import { useState, useRef, useCallback } from 'react'

import {
  createAiStreamState,
  parseAiStreamLine,
  reduceAiStreamState,
  type AskUserAnswer,
  type PendingAiQuestionnaire
} from '../../../../shared/ai-stream-events'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  reasoningDuration?: number
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

type Config = {
  convId: string
  configParam: string
  dataParam: string
}

export function buildUiResponseBody(
  convId: string,
  pending: PendingAiQuestionnaire,
  answers: AskUserAnswer[]
) {
  return {
    conv_id: convId,
    request_id: pending.requestId,
    response_secret: pending.responseSecret,
    answers
  }
}

export function usePierreChat(config: Config) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [pendingQuestionnaire, setPendingQuestionnaire] = useState<PendingAiQuestionnaire | null>(
    null
  )
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
      const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStatus('submitted')

      const ac = new AbortController()
      abortRef.current = ac

      const reasoningStart = Date.now()
      let reasoningSealed = false
      let reasoningDuration: number | undefined
      const streamState = createAiStreamState()

      try {
        const url = `/ai?message=${encodeURIComponent(text)}&config=${encodeURIComponent(config.configParam)}&data=${encodeURIComponent(config.dataParam)}&conv_id=${encodeURIComponent(config.convId)}`
        const res = await fetch(url, { signal: ac.signal })
        if (!res.body) throw new Error('No response body')

        setStatus('streaming')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const processLine = (line: string) => {
          const event = parseAiStreamLine(line)
          if (!event) return

          reduceAiStreamState(streamState, event)
          if (event.type === 'extension_ui_request') {
            setPendingQuestionnaire(streamState.pendingQuestionnaire)
            setQuestionnaireError(null)
          }
          if (event.type === 'stream_end') setPendingQuestionnaire(null)
          if (event.type === 'error') setStatus('error')
          if (streamState.text && !reasoningSealed) {
            reasoningSealed = true
            reasoningDuration = Math.round((Date.now() - reasoningStart) / 1000)
          }
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated.at(-1)
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: streamState.text,
                reasoning: streamState.thinking || undefined,
                ...(reasoningDuration !== undefined ? { reasoningDuration } : {})
              }
            }
            return updated
          })
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            if (buffer.trim()) processLine(buffer)
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) processLine(line)
        }

        setStatus((prev) => (prev === 'error' ? 'error' : 'ready'))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('ready')
          return
        }
        console.error('[usePierreChat] Error:', err)
        setStatus('error')
      } finally {
        abortRef.current = null
      }
    },
    [config.convId, config.configParam, config.dataParam]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPendingQuestionnaire(null)
    setQuestionnaireError(null)
    setStatus('ready')
  }, [])

  const regenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    setMessages((prev) => {
      const idx = prev.findLastIndex((m) => m.role === 'user')
      return idx >= 0 ? prev.slice(0, idx) : prev
    })

    sendMessage(lastUserMsg.content)
  }, [messages, sendMessage])

  const submitQuestionnaire = useCallback(
    async (answers: AskUserAnswer[]) => {
      if (!pendingQuestionnaire) return false
      setQuestionnaireError(null)
      try {
        const response = await fetch('/ai/ui-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildUiResponseBody(config.convId, pendingQuestionnaire, answers))
        })
        if (response.ok) {
          setPendingQuestionnaire(null)
          return true
        }
      } catch (error) {
        console.error('[usePierreChat] UI response failed:', error)
      }
      setQuestionnaireError("La réponse n'a pas pu être envoyée.")
      return false
    },
    [config.convId, pendingQuestionnaire]
  )

  return {
    messages,
    status,
    sendMessage,
    stop,
    regenerate,
    pendingQuestionnaire,
    questionnaireError,
    submitQuestionnaire
  }
}

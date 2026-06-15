import { useState, useRef, useCallback } from 'react'

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

type AiStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'reasoning_delta'; content: string }
  | { type: 'reset' }
  | { type: 'done'; content: string }
  | { type: 'error' }

function parseAiStreamLine(line: string): AiStreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const p = JSON.parse(trimmed) as { type: string; content?: string }
    if (p.type === 'reasoning_delta' && p.content) {
      return { type: 'reasoning_delta', content: p.content }
    }
    if (p.type === 'delta' && p.content) {
      return { type: 'delta', content: p.content }
    }
    if (p.type === 'reset') return { type: 'reset' }
    if (p.type === 'done' && p.content !== undefined) {
      return { type: 'done', content: p.content }
    }
    if (p.type === 'error') return { type: 'error' }
  } catch {
    if (trimmed.includes('pierre_error')) return { type: 'error' }
  }
  return null
}

export function usePierreChat(config: Config) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
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

          switch (event.type) {
            case 'reasoning_delta':
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    reasoning: (last.reasoning ?? '') + event.content
                  }
                }
                return updated
              })
              break
            case 'delta':
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  const patch: Partial<Message> = { content: last.content + event.content }
                  if (!reasoningSealed) {
                    patch.reasoningDuration = Math.round((Date.now() - reasoningStart) / 1000)
                    reasoningSealed = true
                  }
                  updated[updated.length - 1] = { ...last, ...patch }
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

  return { messages, status, sendMessage, stop, regenerate }
}

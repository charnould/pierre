import { useState, useRef, useCallback } from 'react'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

type Config = {
  convId: string
  configParam: string
  dataParam: string
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

      try {
        const url = `/ai?message=${encodeURIComponent(text)}&config=${encodeURIComponent(config.configParam)}&data=${encodeURIComponent(config.dataParam)}&conv_id=${encodeURIComponent(config.convId)}`
        const res = await fetch(url, { signal: ac.signal })
        if (!res.body) throw new Error('No response body')

        setStatus('streaming')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const processLine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed) return
          try {
            const event = JSON.parse(trimmed)
            switch (event.t) {
              case 'response':
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.d.content
                    }
                  }
                  return updated
                })
                break
              case 'reset':
                // Tool turn detected — discard streamed reasoning
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
                // Authoritative final content
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: event.d.content }
                  }
                  return updated
                })
                break
              case 'error':
                setStatus('error')
                break
            }
          } catch {
            if (trimmed.includes('pierre_error')) setStatus('error')
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
    // Find the last user message and resend it
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    // Remove the last assistant message (and possibly the failed one)
    setMessages((prev) => {
      const idx = prev.findLastIndex((m) => m.role === 'user')
      return idx >= 0 ? prev.slice(0, idx) : prev
    })

    sendMessage(lastUserMsg.content)
  }, [messages, sendMessage])

  return { messages, status, sendMessage, stop, regenerate }
}

import type { Message } from '@/features/chat/lib/chat-session-types'

import type { AskUserAnswer } from '../../../../../shared/ai-stream-events'

export function findLastUserMessage(messages: Message[]): Message | undefined {
  return [...messages].reverse().find((m) => m.role === 'user')
}

/** Drops the last assistant turn and everything after the last user message. */
export function truncateAfterLastUserMessage(messages: Message[]): Message[] {
  const idx = messages.findLastIndex((m) => m.role === 'user')
  return idx >= 0 ? messages.slice(0, idx) : messages
}

export type RegeneratePayload = {
  text: string
}

export function buildRegeneratePayload(messages: Message[]): RegeneratePayload | null {
  const lastUser = findLastUserMessage(messages)
  if (!lastUser) return null
  return {
    text: lastUser.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }
}

function isAskUserAnswer(value: unknown): value is AskUserAnswer {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['question'] === 'string' &&
    typeof (value as Record<string, unknown>)['answer'] === 'string'
  )
}

function parseAskUserAnswerArray(value: unknown): AskUserAnswer[] | null {
  return Array.isArray(value) && value.length > 0 && value.every(isAskUserAnswer) ? value : null
}

/** Reads ask_user's structured result without exposing its raw JSON transport. */
export function readAskUserAnswers(result: unknown): AskUserAnswer[] | null {
  const direct = parseAskUserAnswerArray(result)
  if (direct) return direct
  if (!result || typeof result !== 'object') return null

  const record = result as Record<string, unknown>
  const details = record['details']
  if (details && typeof details === 'object') {
    const answers = parseAskUserAnswerArray((details as Record<string, unknown>)['answers'])
    if (answers) return answers
  }

  const content = record['content']
  if (!Array.isArray(content)) return null
  const text = content
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        (part as Record<string, unknown>)['type'] === 'text' &&
        typeof (part as Record<string, unknown>)['text'] === 'string'
    )
    .map((part) => part.text)
    .join('')
  if (!text) return null

  try {
    return parseAskUserAnswerArray(JSON.parse(text))
  } catch {
    return null
  }
}

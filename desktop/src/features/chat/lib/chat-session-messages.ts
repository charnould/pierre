import type { ChatAttachment, Message } from '@/features/chat/lib/chat-session-types'
export { readAskUserAnswers } from '@/shared/lib/read-ask-user-answers'

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
  attachments: ChatAttachment[]
  files: File[]
}

export function buildRegeneratePayload(messages: Message[]): RegeneratePayload | null {
  const lastUser = findLastUserMessage(messages)
  if (!lastUser) return null
  return {
    text: lastUser.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(''),
    attachments: lastUser.attachments ?? [],
    files: lastUser.attachmentsPersisted ? [] : (lastUser.attachmentFiles ?? [])
  }
}

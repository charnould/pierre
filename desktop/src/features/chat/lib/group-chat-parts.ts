import type {
  ChatMessagePart,
  ChatTextPart,
  ChatThinkingPart,
  ChatToolPart
} from '@/features/chat/lib/chat-session-types'

export type ChatWorkPart = ChatThinkingPart | ChatToolPart

export type ChatRenderGroup =
  | { type: 'text'; part: ChatTextPart }
  | { type: 'work'; parts: ChatWorkPart[] }

export function groupChatParts(parts: ChatMessagePart[]): ChatRenderGroup[] {
  const groups: ChatRenderGroup[] = []

  for (const part of parts) {
    if (part.type === 'text') {
      groups.push({ type: 'text', part })
      continue
    }

    const previous = groups.at(-1)
    if (previous?.type === 'work') {
      previous.parts.push(part)
    } else {
      groups.push({ type: 'work', parts: [part] })
    }
  }

  return groups
}

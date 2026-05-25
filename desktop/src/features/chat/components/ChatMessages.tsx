import type { ChatStatus, Message as ChatMessage } from '@/features/chat/hooks/use-chat-session'
import type { ChatBootData } from '@/shared/types'

import { AssistantMessage } from './AssistantMessage'
import { ChatExamples } from './ChatExamples'
import { ChatGreeting } from './ChatGreeting'
import { UserMessageBubble } from './UserMessageBubble'

interface Props {
  messages: ChatMessage[]
  status: ChatStatus
  boot: ChatBootData
  onRegenerate: () => void
  onSend: (text: string) => void
}

export function ChatMessages({ messages, status, boot, onRegenerate, onSend }: Props) {
  const lastIndex = messages.length - 1
  const isEmpty = messages.length === 0

  return (
    <div className="flex w-full flex-col gap-7">
      <div className="flex flex-col gap-5">
        <ChatGreeting greeting={boot.greeting} />
        {isEmpty && <ChatExamples examples={boot.examples} status={status} onSelect={onSend} />}
      </div>

      {messages.length > 0 ? (
        <div className="flex flex-col gap-7">
          {messages.map((msg, index) => {
            if (msg.role === 'user') {
              return <UserMessageBubble key={msg.id} content={msg.content} />
            }
            return (
              <AssistantMessage
                key={msg.id}
                msg={msg}
                isLast={index === lastIndex}
                status={status}
                boot={boot}
                onRegenerate={onRegenerate}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

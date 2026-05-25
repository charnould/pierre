import type { ChatStatus, Message as ChatMessage } from '../../hooks/usePierreChat'
import type { ChatBootData } from '../../types'
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

  return (
    <>
      <ChatGreeting greeting={boot.greeting} />
      {messages.length === 0 && (
        <ChatExamples examples={boot.examples} status={status} onSelect={onSend} />
      )}
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
    </>
  )
}

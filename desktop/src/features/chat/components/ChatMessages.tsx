import { memo } from 'react'

import { ChatAttachmentItems } from '@/features/chat/components/ChatAttachmentItems'
import { resolveAssistantPhase } from '@/features/chat/lib/chat-assistant-phase'
import type { ChatStatus, Message as ChatMessage } from '@/features/chat/lib/chat-session-types'
import { groupChatParts } from '@/features/chat/lib/group-chat-parts'
import { AgentWorkTrace, GeneratedMarkdown } from '@/shared/components/AgentWorkTrace'
import { Bubble, BubbleContent } from '@/shared/components/ui/bubble'
import { Button } from '@/shared/components/ui/button'
import { Message, MessageContent } from '@/shared/components/ui/message'
import { MessageScrollerItem } from '@/shared/components/ui/message-scroller'
import { cn } from '@/shared/lib/utils'
import type { ChatBootData } from '@/shared/types'

const COLUMN_CLASS = 'w-full min-w-0 text-inherit'

function AssistantActionRow({
  message,
  actionLabel,
  onAction,
  columnClass
}: {
  message: string
  actionLabel: string
  onAction: () => void
  columnClass: string
}) {
  return (
    <Message align="start" className={columnClass}>
      <MessageContent>
        <p className="text-muted-foreground">
          {message}{' '}
          <Button
            type="button"
            variant="link"
            className="inline h-auto p-0 font-medium text-inherit"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </p>
      </MessageContent>
    </Message>
  )
}

const ChatAssistantRow = memo(function ChatAssistantRow({
  msg,
  isLast,
  status,
  boot,
  onRegenerate,
  columnClass
}: {
  msg: ChatMessage
  isLast: boolean
  status: ChatStatus
  boot: ChatBootData
  onRegenerate?: () => void
  columnClass: string
}) {
  const hasContent = msg.parts.some((part) => part.type !== 'text' || part.text.trim().length > 0)
  const phase = resolveAssistantPhase(isLast, status, hasContent)
  const isStreaming = isLast && (status === 'submitted' || status === 'streaming')
  const groups = groupChatParts(msg.parts)

  if (phase === 'error' && !hasContent) {
    return (
      <AssistantActionRow
        message="Une erreur s'est produite chez le fournisseur de modèle."
        actionLabel="Réessayer"
        onAction={() => onRegenerate?.()}
        columnClass={columnClass}
      />
    )
  }
  if (phase === 'stopped' && !hasContent) {
    return (
      <AssistantActionRow
        message="Génération interrompue."
        actionLabel="Regénérer"
        onAction={() => onRegenerate?.()}
        columnClass={columnClass}
      />
    )
  }
  if (phase === 'pending') {
    return null
  }

  return (
    <Message align="start" className={columnClass}>
      <MessageContent
        className={cn(isStreaming && groups.at(-1)?.type === 'text' && 'generated-stream-caret')}
      >
        {groups.map((group, index) => {
          if (group.type === 'text') {
            return (
              <GeneratedMarkdown key={group.part.contentIndex} animated={isStreaming}>
                {group.part.text}
              </GeneratedMarkdown>
            )
          }
          return (
            <AgentWorkTrace
              key={group.parts[0]?.contentIndex}
              parts={group.parts}
              display={boot.reasoningDisplay}
              active={isStreaming && index === groups.length - 1}
              duration={msg.reasoningDuration}
            />
          )
        })}
        {phase === 'error' ? (
          <p className="text-destructive text-sm">
            La génération a échoué.{' '}
            <Button
              type="button"
              variant="link"
              className="inline h-auto p-0 font-medium text-inherit"
              onClick={() => onRegenerate?.()}
            >
              Réessayer
            </Button>
          </p>
        ) : phase === 'stopped' ? (
          <p className="text-muted-foreground text-sm">
            Génération interrompue.{' '}
            <Button
              type="button"
              variant="link"
              className="inline h-auto p-0 font-medium text-inherit"
              onClick={() => onRegenerate?.()}
            >
              Regénérer
            </Button>
          </p>
        ) : null}
      </MessageContent>
    </Message>
  )
})

const ChatUserRow = memo(function ChatUserRow({
  message,
  columnClass
}: {
  message: ChatMessage
  columnClass: string
}) {
  const content = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
  return (
    <Message align="end" className={columnClass}>
      <MessageContent className="items-end">
        {content ? (
          <Bubble variant="muted" align="end">
            <BubbleContent>{content}</BubbleContent>
          </Bubble>
        ) : null}
        {message.attachments ? (
          <ChatAttachmentItems attachments={message.attachments} className="w-72 max-w-[80%]" />
        ) : null}
      </MessageContent>
    </Message>
  )
})

interface Props {
  messages: ChatMessage[]
  status: ChatStatus
  boot: ChatBootData
  onRegenerate: () => void
}

export function ChatMessages({ messages, status, boot, onRegenerate }: Props) {
  const lastIndex = messages.length - 1

  return (
    <>
      {messages.map((msg, index) => {
        const isLast = index === lastIndex
        return (
          <MessageScrollerItem key={msg.id} messageId={msg.id} scrollAnchor={msg.role === 'user'}>
            {msg.role === 'user' ? (
              <ChatUserRow message={msg} columnClass={COLUMN_CLASS} />
            ) : (
              <ChatAssistantRow
                msg={msg}
                isLast={isLast}
                status={isLast ? status : 'ready'}
                boot={boot}
                onRegenerate={isLast ? onRegenerate : undefined}
                columnClass={COLUMN_CLASS}
              />
            )}
          </MessageScrollerItem>
        )
      })}
    </>
  )
}

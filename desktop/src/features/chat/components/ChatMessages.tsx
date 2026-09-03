import { Fragment, memo } from 'react'

import { ChatAttachmentItems } from '@/features/chat/components/ChatAttachmentItems'
import { resolveAssistantPhase } from '@/features/chat/lib/chat-assistant-phase'
import type { ChatStatus, Message as ChatMessage } from '@/features/chat/lib/chat-session-types'
import { groupChatParts, type ChatRenderGroup } from '@/features/chat/lib/group-chat-parts'
import { AgentWorkTrace, GeneratedMarkdown } from '@/shared/components/AgentWorkTrace'
import { Bubble, BubbleContent } from '@/shared/components/ui/bubble'
import { Button } from '@/shared/components/ui/button'
import { Message, MessageContent } from '@/shared/components/ui/message'
import { MessageScrollerItem } from '@/shared/components/ui/message-scroller'
import type { ChatBoot } from '@/shared/types'

function AssistantActionRow({
  message,
  actionLabel,
  onAction
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <Message align="start">
      <MessageContent>
        <p className="text-muted-foreground">
          {message}{' '}
          <Button
            type="button"
            variant="link"
            className="inline h-auto p-0 text-inherit"
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
  onRegenerate
}: {
  msg: ChatMessage
  isLast: boolean
  status: ChatStatus
  boot: ChatBoot
  onRegenerate?: () => void
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
      />
    )
  }
  if (phase === 'stopped' && !hasContent) {
    return (
      <AssistantActionRow
        message="Génération interrompue."
        actionLabel="Regénérer"
        onAction={() => onRegenerate?.()}
      />
    )
  }
  const rows: ChatRenderGroup[] =
    groups.length === 0 && isStreaming ? [{ type: 'work', parts: [] }] : groups

  if (rows.length === 0) return null

  return (
    <Message align="start">
      <MessageContent
        className={
          isStreaming && rows.at(-1)?.type === 'text' ? 'generated-stream-caret' : undefined
        }
      >
        {rows.map((group, index) => {
          if (group.type === 'text') {
            return (
              <GeneratedMarkdown
                key={group.part.contentIndex}
                animated={isStreaming}
                className="typeset-reply"
              >
                {group.part.text}
              </GeneratedMarkdown>
            )
          }
          return (
            <AgentWorkTrace
              key={`work-${index}`}
              parts={group.parts}
              display={boot.trace}
              active={isStreaming && index === rows.length - 1}
              duration={msg.reasoningDuration}
              hold
            />
          )
        })}
        {phase === 'error' ? (
          <p className="text-destructive text-sm">
            La génération a échoué.{' '}
            <Button
              type="button"
              variant="link"
              className="inline h-auto p-0 text-inherit"
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
              className="inline h-auto p-0 text-inherit"
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

const ChatUserRow = memo(function ChatUserRow({ message }: { message: ChatMessage }) {
  const content = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
  return (
    <Message align="end">
      <MessageContent className="items-end">
        {content ? (
          <Bubble variant="muted" align="end">
            <BubbleContent dir="auto">{content}</BubbleContent>
          </Bubble>
        ) : null}
        {message.attachments ? (
          <ChatAttachmentItems
            layout="chip"
            attachments={message.attachments}
            className="max-w-[80%]"
          />
        ) : null}
      </MessageContent>
    </Message>
  )
})

interface Props {
  messages: ChatMessage[]
  status: ChatStatus
  boot: ChatBoot
  onRegenerate: () => void
  scroller?: boolean
}

export function ChatMessages({ messages, status, boot, onRegenerate, scroller = true }: Props) {
  const lastIndex = messages.length - 1

  return (
    <>
      {messages.map((msg, index) => {
        const isLast = index === lastIndex
        const row =
          msg.role === 'user' ? (
            <ChatUserRow message={msg} />
          ) : (
            <ChatAssistantRow
              msg={msg}
              isLast={isLast}
              status={isLast ? status : 'ready'}
              boot={boot}
              onRegenerate={isLast ? onRegenerate : undefined}
            />
          )
        if (!scroller) return <Fragment key={msg.id}>{row}</Fragment>
        return (
          <MessageScrollerItem key={msg.id} messageId={msg.id} scrollAnchor={msg.role === 'user'}>
            {row}
          </MessageScrollerItem>
        )
      })}
    </>
  )
}

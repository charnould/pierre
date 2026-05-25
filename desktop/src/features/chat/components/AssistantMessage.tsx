import { Message, MessageContent, MessageResponse } from '@/features/chat/components/ai/message'
import { Reasoning, ReasoningTrigger } from '@/features/chat/components/ai/reasoning'
import type { ChatStatus, Message as ChatMessage } from '@/features/chat/hooks/use-chat-session'
import { Button } from '@/shared/components/ui/button'
import type { ChatBootData, ReasoningDisplay } from '@/shared/types'

import { CHAT_ASSISTANT_CONTENT_CLASS, CHAT_CONTENT_MAX_W } from './chat-utils'
import { ReasoningPlainContent } from './ReasoningPlainContent'
import { ThinkingPlaceholder } from './ThinkingPlaceholder'

type AssistantPhase = 'error' | 'stopped' | 'pending' | 'complete'

function resolveAssistantPhase(
  isLast: boolean,
  status: ChatStatus,
  hasContent: boolean
): AssistantPhase {
  if (!isLast || hasContent) return 'complete'
  if (status === 'stopped') return 'stopped'
  if (status === 'error') return 'error'
  if (status === 'submitted' || status === 'streaming') return 'pending'
  return 'complete'
}

function MessageReasoning({
  reasoning,
  display,
  isStreaming,
  isReasoningPhase,
  duration
}: {
  reasoning: string
  display: ReasoningDisplay
  isStreaming: boolean
  isReasoningPhase?: boolean
  duration?: number
}) {
  if (display === 'off') return null

  const reasoningActive = isStreaming && (isReasoningPhase ?? true)

  return (
    <Reasoning
      displayMode={display}
      isStreaming={isStreaming}
      isReasoningActive={reasoningActive}
      sealDuration={!isStreaming}
      duration={!isStreaming ? duration : undefined}
      defaultOpen={display === 'full' ? reasoningActive : undefined}
    >
      <ReasoningTrigger className="w-fit" />
      <ReasoningPlainContent isStreaming={reasoningActive}>{reasoning}</ReasoningPlainContent>
    </Reasoning>
  )
}

function AssistantActionMessage({
  message,
  actionLabel,
  onAction
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <Message from="assistant">
      <MessageContent className={CHAT_ASSISTANT_CONTENT_CLASS}>
        <p className="text-muted-foreground text-sm">
          {message}{' '}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="inline h-auto p-0 text-sm font-medium"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </p>
      </MessageContent>
    </Message>
  )
}

function AssistantStoppedMessage({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <AssistantActionMessage
      message="Génération interrompue."
      actionLabel="Regénérer"
      onAction={onRegenerate}
    />
  )
}

function AssistantErrorMessage({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <Message from="assistant">
      <MessageContent className={CHAT_ASSISTANT_CONTENT_CLASS}>
        <p className="text-muted-foreground text-sm">
          Une erreur s&apos;est produite chez le fournisseur de modèle.{' '}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="inline h-auto p-0 text-sm font-medium"
            onClick={onRegenerate}
          >
            Réessayer
          </Button>
          . Patientez quelques minutes si le problème persiste.
        </p>
      </MessageContent>
    </Message>
  )
}

function AssistantPendingMessage({
  msg,
  boot,
  isStreaming
}: {
  msg: ChatMessage
  boot: ChatBootData
  isStreaming: boolean
}) {
  const { reasoningDisplay, reasoningPlaceholders } = boot
  const showReasoning = reasoningDisplay !== 'off' && !!msg.reasoning

  return (
    <Message from="assistant">
      <MessageContent className={CHAT_ASSISTANT_CONTENT_CLASS}>
        {showReasoning ? (
          <MessageReasoning
            reasoning={msg.reasoning!}
            display={reasoningDisplay}
            isStreaming={isStreaming}
            isReasoningPhase={msg.isReasoningPhase}
          />
        ) : (
          <ThinkingPlaceholder placeholders={reasoningPlaceholders} />
        )}
      </MessageContent>
    </Message>
  )
}

function AssistantCompleteMessage({
  msg,
  boot,
  isStreaming
}: {
  msg: ChatMessage
  boot: ChatBootData
  isStreaming: boolean
}) {
  const streamAnimation = isStreaming
    ? { animation: 'blurIn' as const, duration: 200, easing: 'ease-out' as const }
    : undefined

  return (
    <Message from="assistant" className={`${CHAT_CONTENT_MAX_W} gap-4`}>
      {msg.reasoning && (
        <MessageReasoning
          reasoning={msg.reasoning}
          display={boot.reasoningDisplay}
          isStreaming={isStreaming}
          isReasoningPhase={msg.isReasoningPhase}
          duration={msg.reasoningDuration}
        />
      )}
      <MessageContent className={CHAT_ASSISTANT_CONTENT_CLASS}>
        <div className="llm-answer">
          <MessageResponse
            animated={streamAnimation}
            isAnimating={isStreaming}
            caret={isStreaming ? 'block' : undefined}
          >
            {msg.content}
          </MessageResponse>
        </div>
      </MessageContent>
    </Message>
  )
}

export function AssistantMessage({
  msg,
  isLast,
  status,
  boot,
  onRegenerate
}: {
  msg: ChatMessage
  isLast: boolean
  status: ChatStatus
  boot: ChatBootData
  onRegenerate: () => void
}) {
  const phase = resolveAssistantPhase(isLast, status, !!msg.content)
  const isStreaming = isLast && status === 'streaming'

  switch (phase) {
    case 'error':
      return <AssistantErrorMessage onRegenerate={onRegenerate} />
    case 'stopped':
      return <AssistantStoppedMessage onRegenerate={onRegenerate} />
    case 'pending':
      return <AssistantPendingMessage msg={msg} boot={boot} isStreaming={isStreaming} />
    default:
      return <AssistantCompleteMessage msg={msg} boot={boot} isStreaming={isStreaming} />
  }
}

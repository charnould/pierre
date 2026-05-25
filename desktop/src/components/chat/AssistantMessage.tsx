import { Message, MessageContent, MessageResponse } from '@/components/ai/message'
import { Reasoning, ReasoningTrigger } from '@/components/ai/reasoning'
import { cn } from '@/lib/utils'

import type { ChatStatus, Message as ChatMessage } from '../../hooks/usePierreChat'
import type { ChatBootData, ReasoningDisplay } from '../../types'
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
      <ReasoningTrigger />
      <ReasoningPlainContent>{reasoning}</ReasoningPlainContent>
    </Reasoning>
  )
}

function AssistantStoppedMessage({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <Message from="assistant">
      <MessageContent className="bg-transparent p-0">
        <p className="text-foreground text-[13px]">
          Génération interrompue par l&apos;utilisateur.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={onRegenerate}
          >
            Cliquer pour regénérer une réponse
          </button>
          .
        </p>
      </MessageContent>
    </Message>
  )
}

function AssistantErrorMessage({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <Message from="assistant">
      <MessageContent className="bg-transparent p-0">
        <p className="text-foreground text-[13px]">
          Une erreur s&apos;est produite chez le fournisseur de modèle de langage.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={onRegenerate}
          >
            Cliquer pour regénérer une réponse
          </button>
          . Si le problème persiste, patienter quelques minutes.
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
      <MessageContent className="bg-transparent p-0">
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
    <Message from="assistant">
      <div className="flex w-full flex-col gap-6">
        {msg.reasoning && (
          <MessageReasoning
            reasoning={msg.reasoning}
            display={boot.reasoningDisplay}
            isStreaming={isStreaming}
            isReasoningPhase={msg.isReasoningPhase}
            duration={msg.reasoningDuration}
          />
        )}
        <MessageContent
          className={cn('bg-transparent p-0 text-foreground', 'group-[.is-assistant]:max-w-full')}
        >
          <MessageResponse
            animated={streamAnimation}
            isAnimating={isStreaming}
            caret={isStreaming ? 'block' : undefined}
          >
            {msg.content}
          </MessageResponse>
        </MessageContent>
      </div>
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

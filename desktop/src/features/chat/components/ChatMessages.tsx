import { CheckCircle2Icon, ChevronDownIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ChatAttachmentItems } from '@/features/chat/components/ChatAttachmentItems'
import { resolveAssistantPhase } from '@/features/chat/lib/chat-assistant-phase'
import { readAskUserAnswers } from '@/features/chat/lib/chat-session-messages'
import type {
  ChatStatus,
  ChatToolPart,
  Message as ChatMessage
} from '@/features/chat/lib/chat-session-types'
import { groupChatParts, type ChatWorkPart } from '@/features/chat/lib/group-chat-parts'
import { createStreamingWordsPlugin } from '@/features/chat/lib/rehype-streaming-words'
import { Reasoning, ReasoningTrigger } from '@/shared/components/reasoning/reasoning'
import { Bubble, BubbleContent } from '@/shared/components/ui/bubble'
import { Button } from '@/shared/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { Message, MessageContent } from '@/shared/components/ui/message'
import { MessageScrollerItem } from '@/shared/components/ui/message-scroller'
import { cn } from '@/shared/lib/utils'
import type { ChatBootData, ReasoningDisplay } from '@/shared/types'

const COLUMN_CLASS = 'w-full min-w-0 text-inherit'
const TOOL_OUTPUT_LIMIT = 20_000
const REMARK_PLUGINS = [remarkGfm]

const Markdown = memo(
  function Markdown({
    children,
    muted = false,
    animated = false,
    reasoning = false
  }: {
    children: string
    muted?: boolean
    animated?: boolean
    reasoning?: boolean
  }) {
    'use no memo'
    const committedLength = useRef(0)
    // Previous committed length must be read during this paint so only newly
    // streamed words animate. A ref is the only way to keep that value without
    // discarding the first render of the new children.
    // oxlint-disable-next-line react/refs
    const previousLength = committedLength.current
    const rehypePlugins = animated ? [createStreamingWordsPlugin(previousLength)] : undefined
    useLayoutEffect(() => {
      committedLength.current = children.length
    }, [children])

    if (!children.trim()) return null
    return (
      <div
        className={cn(
          'typeset typeset-docs min-w-0',
          muted && 'text-muted-foreground',
          reasoning && 'typeset-reasoning'
        )}
      >
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={rehypePlugins}>
          {children}
        </ReactMarkdown>
      </div>
    )
  },
  (previous, next) => {
    if (
      previous.children !== next.children ||
      previous.muted !== next.muted ||
      previous.reasoning !== next.reasoning
    ) {
      return false
    }
    if (previous.animated && !next.animated) return true
    return previous.animated === next.animated
  }
)

function serializeToolOutput(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function toolArgumentLabel(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const args = value as Record<string, unknown>
  const candidate =
    args.path ??
    args.file ??
    args.filename ??
    args.filePath ??
    args.command ??
    args.cmd ??
    args.pattern ??
    args.query ??
    args.search ??
    args.url
  return typeof candidate === 'string' ? candidate : ''
}

function AskUserResult({ output }: { output: unknown }) {
  const answers = readAskUserAnswers(output)
  if (!answers) return null

  return (
    <div className="typeset typeset-docs px-1.5">
      <ol>
        {answers.map((entry) => (
          <li key={entry.question}>
            <span className="text-muted-foreground">{entry.question}</span>{' '}
            <span className="text-foreground font-medium">{entry.answer}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ToolPart({ part }: { part: ChatToolPart }) {
  if (part.name === 'ask_user' && part.status === 'success') {
    const result = <AskUserResult output={part.output} />
    if (readAskUserAnswers(part.output)) return result
  }

  const output = part.output === undefined ? '' : serializeToolOutput(part.output)
  const expanded =
    output.length > TOOL_OUTPUT_LIMIT ? `${output.slice(0, TOOL_OUTPUT_LIMIT)}\n…` : output
  const running = part.status === 'running' || part.status === 'input-streaming'
  const toolName = part.name ? part.name.replaceAll('_', ' ') : 'Outil'
  const argument = toolArgumentLabel(part.arguments)
  const label = argument ? `${toolName} · ${argument}` : toolName
  const statusLabel = running ? 'En cours' : part.status === 'error' ? 'Échec' : 'Terminé'

  return (
    <div className="min-w-0 py-1">
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 text-xs',
          part.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {running ? (
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" />
        ) : part.status === 'error' ? (
          <CircleXIcon className="size-3.5 shrink-0" />
        ) : (
          <CheckCircle2Icon className="size-3.5 shrink-0" />
        )}
        <span className="shrink-0 font-medium">{statusLabel}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{label}</span>
      </div>
      {expanded ? (
        <Collapsible className="min-w-0">
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground mt-1 h-6 px-0 text-[0.6875rem] hover:bg-transparent"
              />
            }
          >
            <span className="in-data-[panel-open]:hidden">Afficher le résultat</span>
            <span className="hidden in-data-[panel-open]:inline">Masquer le résultat</span>
            <ChevronDownIcon className="size-3 transition-transform in-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="outline-none">
            <pre className="border-border/60 text-muted-foreground mt-1 max-h-32 overflow-auto border-s ps-3 font-mono text-[0.6875rem] leading-4 whitespace-pre-wrap">
              {expanded}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

function workSummary({
  parts,
  active,
  duration
}: {
  parts: ChatWorkPart[]
  active: boolean
  duration?: number
}) {
  const toolCount = parts.filter((part) => part.type === 'tool').length
  const hasThinking = parts.some((part) => part.type === 'thinking' && part.thinking.trim())

  if (active) return toolCount > 0 ? 'Travail en cours' : 'Réflexion'

  const toolLabel =
    toolCount > 0
      ? `${toolCount} outil${toolCount > 1 ? 's' : ''} utilisé${toolCount > 1 ? 's' : ''}`
      : ''
  const reasoningLabel = hasThinking
    ? duration !== undefined
      ? `Réflexion pendant ${duration} seconde${duration > 1 ? 's' : ''}`
      : 'Réflexion terminée'
    : ''

  return [reasoningLabel, toolLabel].filter(Boolean).join(' · ')
}

function AgentWorkTrace({
  parts,
  display,
  active,
  duration
}: {
  parts: ChatWorkPart[]
  display: ReasoningDisplay
  active: boolean
  duration?: number
}) {
  const visibleParts = parts.filter(
    (part) => part.type === 'tool' || (display !== 'off' && part.thinking.trim())
  )
  const [open, setOpen] = useState(display === 'full' && active)
  const [syncKey, setSyncKey] = useState(`${display}:${active}`)
  const nextKey = `${display}:${active}`
  if (syncKey !== nextKey) {
    setSyncKey(nextKey)
    setOpen(display === 'full' && active)
  }

  if (visibleParts.length === 0) return null
  const label = workSummary({ parts: visibleParts, active, duration })

  return (
    <Reasoning
      className="mb-0"
      displayMode={display === 'full' ? 'full' : 'partial'}
      duration={duration}
      isReasoningActive={active}
      isStreaming={active}
      open={open}
      onOpenChange={setOpen}
    >
      <ReasoningTrigger
        className="text-xs"
        getThinkingMessage={() => (
          <span className="flex min-w-0 items-center gap-2">
            {active ? <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" /> : null}
            <span className="truncate">{label}</span>
          </span>
        )}
      />
      <CollapsibleContent className="data-open:animate-in data-closed:animate-out outline-none">
        <div className="border-border/60 mt-2 flex min-w-0 flex-col gap-2 border-s ps-3">
          {visibleParts.map((part) =>
            part.type === 'thinking' ? (
              <Markdown key={part.contentIndex} muted reasoning animated={active}>
                {part.thinking}
              </Markdown>
            ) : (
              <ToolPart key={`${part.contentIndex}-${part.toolCallId ?? 'pending'}`} part={part} />
            )
          )}
        </div>
      </CollapsibleContent>
    </Reasoning>
  )
}

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
        className={cn(isStreaming && groups.at(-1)?.type === 'text' && 'chat-stream-caret')}
      >
        {groups.map((group, index) => {
          if (group.type === 'text') {
            return (
              <Markdown key={group.part.contentIndex} animated={isStreaming}>
                {group.part.text}
              </Markdown>
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

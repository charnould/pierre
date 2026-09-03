import { CheckCircle2Icon, ChevronDownIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Reasoning, ReasoningTrigger } from '@/shared/components/reasoning/reasoning'
import { Button } from '@/shared/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { readAskUserAnswers } from '@/shared/lib/read-ask-user-answers'
import { createStreamingWordsPlugin } from '@/shared/lib/rehype-streaming-words'
import { cn } from '@/shared/lib/utils'
import type { ReasoningDisplay } from '@/shared/types'

const TOOL_OUTPUT_LIMIT = 20_000
const REMARK_PLUGINS = [remarkGfm]
const MARKDOWN_COMPONENTS = {
  table: ({ node: _node, ...props }: ComponentProps<'table'> & { node?: unknown }) => (
    <div className="typeset-scroll">
      <table {...props} />
    </div>
  )
}

export type AgentThinkingPart = {
  type: 'thinking'
  contentIndex: number
  thinking: string
}

export type AgentToolPart = {
  type: 'tool'
  contentIndex: number
  toolCallId?: string
  name?: string
  arguments?: unknown
  status: 'input-streaming' | 'running' | 'success' | 'error'
  output?: unknown
}

export type AgentWorkPart = AgentThinkingPart | AgentToolPart

export const GeneratedMarkdown = memo(
  function GeneratedMarkdown({
    children,
    muted = false,
    animated = false,
    reasoning = false,
    className
  }: {
    children: string
    muted?: boolean
    animated?: boolean
    reasoning?: boolean
    className?: string
  }) {
    'use no memo'
    const committedLength = useRef(0)
    // oxlint-disable-next-line react/refs -- the previous paint frontier selects only new words
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
          reasoning && 'typeset-reasoning',
          className
        )}
      >
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={rehypePlugins}
          components={MARKDOWN_COMPONENTS}
        >
          {children}
        </ReactMarkdown>
      </div>
    )
  },
  (previous, next) => {
    if (
      previous.children !== next.children ||
      previous.muted !== next.muted ||
      previous.reasoning !== next.reasoning ||
      previous.className !== next.className
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

function ToolPart({ part }: { part: AgentToolPart }) {
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
  parts: AgentWorkPart[]
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

export function AgentWorkTrace({
  parts,
  display,
  active,
  duration
}: {
  parts: AgentWorkPart[]
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
              <GeneratedMarkdown key={part.contentIndex} muted reasoning animated={active}>
                {part.thinking}
              </GeneratedMarkdown>
            ) : (
              <ToolPart key={`${part.contentIndex}-${part.toolCallId ?? 'pending'}`} part={part} />
            )
          )}
        </div>
      </CollapsibleContent>
    </Reasoning>
  )
}

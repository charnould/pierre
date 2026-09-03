import { CheckCircle2Icon, ChevronDownIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { memo, useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Reasoning, ReasoningTrigger } from '@/shared/components/reasoning/reasoning'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { readAskUserAnswers } from '@/shared/lib/read-ask-user-answers'
import { createStreamingWordsPlugin } from '@/shared/lib/rehype-streaming-words'
import { cn } from '@/shared/lib/utils'
import { showsThinking, showsTools, type TraceMode } from '@/shared/types/chat'

const TOOL_OUTPUT_LIMIT = 20_000
const REMARK_PLUGINS = [remarkGfm]
const MARKDOWN_COMPONENTS = {
  table: ({ node: _node, ...props }: ComponentProps<'table'> & { node?: unknown }) => (
    <div className="typeset-scroll">
      <table {...props} />
    </div>
  )
}

type AgentThinkingPart = {
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
          'typeset min-w-0',
          reasoning ? 'typeset-reasoning' : 'typeset-docs',
          muted && 'text-muted-foreground',
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
    <div className="typeset typeset-reasoning px-1.5">
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
  const failed = part.status === 'error'

  const statusIcon = running ? (
    <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" />
  ) : failed ? (
    <CircleXIcon className="size-3.5 shrink-0" />
  ) : (
    <CheckCircle2Icon className="size-3.5 shrink-0" />
  )

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'pierre-type-table-header flex min-w-0 items-center gap-1.5',
          failed ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {statusIcon}
        {failed ? (
          <>
            <span className="shrink-0 font-medium">Échec</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span className="shrink-0 font-medium">{toolName}</span>
        {argument ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">{argument}</span>
          </>
        ) : null}
      </div>
      {expanded ? (
        <Collapsible className="min-w-0">
          <CollapsibleTrigger type="button" className="mt-1 flex items-center">
            <span className="pierre-type-table-header text-muted-foreground flex items-center gap-1">
              <span className="in-data-[panel-open]:hidden">Afficher le résultat</span>
              <span className="hidden in-data-[panel-open]:inline">Masquer le résultat</span>
              <ChevronDownIcon className="size-3 transition-transform in-data-[panel-open]:rotate-180" />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="border-border pierre-type-table-header text-muted-foreground mt-1 max-h-32 overflow-auto rounded-md border p-2 font-mono whitespace-pre">
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
  duration,
  hold = false
}: {
  parts: AgentWorkPart[]
  display: TraceMode
  active: boolean
  duration?: number
  hold?: boolean
}) {
  const visibleParts = parts.filter((part) => {
    if (part.type === 'thinking') return showsThinking(display) && part.thinking.trim()
    return showsTools(display)
  })
  const [open, setOpen] = useState(display === 'expanded')
  const [syncKey, setSyncKey] = useState(display)
  if (syncKey !== display) {
    setSyncKey(display)
    setOpen(display === 'expanded')
  }

  if (visibleParts.length === 0) {
    if (!active || !hold) return null
    return (
      <div className="pierre-type-table-header text-muted-foreground flex items-center gap-1.5">
        <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" />
        Réflexion
      </div>
    )
  }
  const label = workSummary({ parts: visibleParts, active, duration })
  return (
    <Reasoning
      className="mb-0"
      displayMode={display === 'expanded' ? 'full' : 'partial'}
      duration={duration}
      isReasoningActive={active}
      isStreaming={active}
      open={open}
      onOpenChange={setOpen}
    >
      <ReasoningTrigger
        getThinkingMessage={() => (
          <span className="flex min-w-0 items-center gap-1.5">
            {active ? <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" /> : null}
            <span className="truncate">{label}</span>
          </span>
        )}
      />
      <CollapsibleContent variant="animated">
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

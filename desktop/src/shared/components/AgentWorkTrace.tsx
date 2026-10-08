import { CheckCircle2Icon, CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { type ComponentProps, memo, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton
} from '@/shared/components/ui/code-block'
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '@/shared/components/ui/trace'
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

function toolTitle(part: AgentToolPart): string {
  const toolName = part.name ? part.name.replaceAll('_', ' ') : 'Outil'
  const argument = toolArgumentLabel(part.arguments)
  const failed = part.status === 'error'
  return [failed ? 'Échec' : '', toolName, argument].filter(Boolean).join(' · ')
}

function ToolStatusIcon({ part }: { part: AgentToolPart }) {
  const running = part.status === 'running' || part.status === 'input-streaming'
  if (running) return <LoaderCircleIcon className="animate-spin" />
  if (part.status === 'error') return <CircleXIcon />
  return <CheckCircle2Icon />
}

function ToolPart({ part }: { part: AgentToolPart }) {
  if (part.name === 'ask_user' && part.status === 'success' && readAskUserAnswers(part.output)) {
    return <AskUserResult output={part.output} />
  }

  const running = part.status === 'running' || part.status === 'input-streaming'
  const failed = part.status === 'error'
  const output = part.output === undefined ? undefined : serializeToolOutput(part.output)
  const shown =
    output === undefined
      ? undefined
      : output.length > TOOL_OUTPUT_LIMIT
        ? `${output.slice(0, TOOL_OUTPUT_LIMIT)}\n…`
        : output
  const line = (
    <TraceLine status={running ? 'running' : failed ? 'error' : undefined}>
      <TraceIcon>
        <ToolStatusIcon part={part} />
      </TraceIcon>
      <TraceTitle>{toolTitle(part)}</TraceTitle>
    </TraceLine>
  )

  if (!shown) return line

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <CodeBlock size="sm" variant={failed ? 'destructive' : 'default'}>
          <CodeBlockActions>
            <CodeBlockCopyButton value={shown} />
          </CodeBlockActions>
          <CodeBlockContent className="max-h-64">{shown}</CodeBlockContent>
        </CodeBlock>
      </TraceCollapsibleContent>
    </TraceCollapsible>
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

function RunningLine({ label }: { label: string }) {
  return (
    <TraceLine status="running">
      <TraceIcon>
        <LoaderCircleIcon className="animate-spin" />
      </TraceIcon>
      <TraceTitle>{label}</TraceTitle>
    </TraceLine>
  )
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
      <Trace>
        <RunningLine label="Réflexion" />
      </Trace>
    )
  }

  const label = workSummary({ parts: visibleParts, active, duration })
  return (
    <TraceCollapsible open={open} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        {active ? (
          <RunningLine label={label} />
        ) : (
          <TraceLine>
            <TraceTitle>{label}</TraceTitle>
          </TraceLine>
        )}
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>
          {visibleParts.map((part) =>
            part.type === 'thinking' ? (
              <GeneratedMarkdown key={part.contentIndex} muted reasoning animated={active}>
                {part.thinking}
              </GeneratedMarkdown>
            ) : (
              <ToolPart key={`${part.contentIndex}-${part.toolCallId ?? 'pending'}`} part={part} />
            )
          )}
        </Trace>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

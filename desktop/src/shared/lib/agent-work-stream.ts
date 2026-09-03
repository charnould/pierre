import type { AgentToolPart, AgentWorkPart } from '@/shared/components/AgentWorkTrace'

import type { AiMessageContent, AiStreamEvent } from '../../../../shared/ai-stream-events'

export type AgentWorkStreamState = {
  parts: AgentWorkPart[]
  contentBase: number
  segmentFinalized: boolean
}

export function createAgentWorkStreamState(): AgentWorkStreamState {
  return { parts: [], contentBase: 0, segmentFinalized: false }
}

function maxContentIndex(parts: AgentWorkPart[]): number {
  return parts.reduce((max, part) => Math.max(max, part.contentIndex), -1)
}

function startSegment(state: AgentWorkStreamState) {
  if (!state.segmentFinalized) return
  state.contentBase = maxContentIndex(state.parts) + 1
  state.segmentFinalized = false
}

function upsertPart(
  state: AgentWorkStreamState,
  contentIndex: number,
  create: () => AgentWorkPart,
  update: (part: AgentWorkPart) => AgentWorkPart
) {
  const absoluteIndex = state.contentBase + contentIndex
  const existing = state.parts.findIndex((part) => part.contentIndex === absoluteIndex)
  if (existing >= 0) state.parts[existing] = update(state.parts[existing]!)
  else state.parts.push({ ...create(), contentIndex: absoluteIndex })
  state.parts.sort((a, b) => a.contentIndex - b.contentIndex)
}

function updateTool(
  state: AgentWorkStreamState,
  toolCallId: string,
  create: () => AgentToolPart,
  update: (part: AgentToolPart) => AgentToolPart
) {
  const index = state.parts.findIndex(
    (part) => part.type === 'tool' && part.toolCallId === toolCallId
  )
  if (index < 0) state.parts.push(create())
  else state.parts[index] = update(state.parts[index] as AgentToolPart)
  state.parts.sort((a, b) => a.contentIndex - b.contentIndex)
}

function workPart(
  part: AiMessageContent,
  contentIndex: number,
  previousTools: Map<string, AgentToolPart>
): AgentWorkPart | null {
  if (part.type === 'thinking') return { type: 'thinking', contentIndex, thinking: part.thinking }
  if (part.type !== 'toolCall') return null
  const previous = previousTools.get(part.id)
  return {
    type: 'tool',
    contentIndex,
    toolCallId: part.id,
    name: part.name,
    arguments: part.arguments,
    status: previous?.status ?? 'running',
    ...(previous?.output === undefined ? {} : { output: previous.output })
  }
}

export function applyAgentWorkStreamEvent(
  state: AgentWorkStreamState,
  event: AiStreamEvent,
  captureReasoning: boolean
) {
  if (
    !captureReasoning &&
    (event.type === 'thinking_start' ||
      event.type === 'thinking_delta' ||
      event.type === 'thinking_end')
  ) {
    return
  }

  switch (event.type) {
    case 'text_start':
    case 'text_delta':
    case 'text_end':
      startSegment(state)
      break
    case 'thinking_start':
    case 'thinking_delta':
    case 'thinking_end': {
      startSegment(state)
      const thinking =
        event.type === 'thinking_start'
          ? ''
          : event.type === 'thinking_delta'
            ? event.delta
            : event.content
      upsertPart(
        state,
        event.contentIndex,
        () => ({ type: 'thinking', contentIndex: 0, thinking }),
        (part) => ({
          type: 'thinking',
          contentIndex: part.contentIndex,
          thinking:
            event.type === 'thinking_delta' && part.type === 'thinking'
              ? part.thinking + event.delta
              : thinking
        })
      )
      break
    }
    case 'toolcall_start':
      startSegment(state)
      upsertPart(
        state,
        event.contentIndex,
        () => ({
          type: 'tool',
          contentIndex: 0,
          toolCallId: event.toolCallId,
          name: event.toolName,
          status: 'input-streaming'
        }),
        (part) => ({
          type: 'tool',
          contentIndex: part.contentIndex,
          toolCallId: event.toolCallId,
          name: event.toolName,
          status: part.type === 'tool' ? part.status : 'input-streaming'
        })
      )
      break
    case 'toolcall_end':
      startSegment(state)
      upsertPart(
        state,
        event.contentIndex,
        () => ({
          type: 'tool',
          contentIndex: 0,
          toolCallId: event.toolCall.id,
          name: event.toolCall.name,
          arguments: event.toolCall.arguments,
          status: 'running'
        }),
        (part) => ({
          type: 'tool',
          contentIndex: part.contentIndex,
          toolCallId: event.toolCall.id,
          name: event.toolCall.name,
          arguments: event.toolCall.arguments,
          status: part.type === 'tool' ? part.status : 'running'
        })
      )
      break
    case 'tool_execution_start':
    case 'tool_execution_update':
    case 'tool_execution_end':
      updateTool(
        state,
        event.toolCallId,
        () => ({
          type: 'tool',
          contentIndex: maxContentIndex(state.parts) + 1,
          toolCallId: event.toolCallId,
          name: event.toolName,
          arguments: 'args' in event ? event.args : undefined,
          status:
            event.type === 'tool_execution_end' ? (event.isError ? 'error' : 'success') : 'running',
          ...('partialResult' in event
            ? { output: event.partialResult }
            : 'result' in event
              ? { output: event.result }
              : {})
        }),
        (part) => ({
          ...part,
          name: event.toolName,
          ...('args' in event ? { arguments: event.args } : {}),
          status:
            event.type === 'tool_execution_end' ? (event.isError ? 'error' : 'success') : 'running',
          ...('partialResult' in event
            ? { output: event.partialResult }
            : 'result' in event
              ? { output: event.result }
              : {})
        })
      )
      break
    case 'message_end': {
      const previousTools = new Map(
        state.parts
          .filter((part): part is AgentToolPart => part.type === 'tool' && !!part.toolCallId)
          .map((part) => [part.toolCallId!, part])
      )
      const current = event.message.content.flatMap((part, index) => {
        if (!captureReasoning && part.type === 'thinking') return []
        const projected = workPart(part, state.contentBase + index, previousTools)
        return projected ? [projected] : []
      })
      state.parts = [
        ...state.parts.filter((part) => part.contentIndex < state.contentBase),
        ...current
      ].sort((a, b) => a.contentIndex - b.contentIndex)
      state.segmentFinalized = true
      break
    }
  }
}

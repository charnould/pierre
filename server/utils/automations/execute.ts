import { JSDOM } from 'jsdom'

import type { AiStreamMessage } from '../../../shared/ai-stream-events'
import type { AutomationRecord } from '../../../shared/automations'
import { AI_MODEL } from '../ai-model'
import { streamCopilot } from '../copilot-agent'
import { WORKFLOW_USER_PROMPT } from '../workflow-payload'
import { AutomationsError } from './store'

type ReportStream = typeof streamCopilot

function argumentStrings(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  return Object.values(value as Record<string, unknown>)
    .filter((item): item is string => typeof item === 'string')
    .join('')
}

function messageText(message: AiStreamMessage): string {
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/** The stored report is the single article. Anything around it is discarded. */
export function reportArticle(transcript: string): string {
  const dom = new JSDOM(transcript)
  try {
    const articles = [...dom.window.document.querySelectorAll('article.report')]
    if (articles.length !== 1) throw new AutomationsError('Rapport invalide.', 'unavailable')
    return articles[0]!.outerHTML
  } finally {
    dom.window.close()
  }
}

export async function execute_automation(
  automation: AutomationRecord,
  context: { runToken: string; signal: AbortSignal },
  stream: ReportStream = streamCopilot
): Promise<{ kind: 'report'; contenu: string }> {
  if (automation.type !== 'report') {
    throw new AutomationsError('Pré-génération de réponses non disponible.', 'unavailable')
  }
  let transcript = ''
  for await (const chunk of stream(
    Bun.randomUUIDv7(),
    'report',
    WORKFLOW_USER_PROMPT,
    AI_MODEL,
    context.signal,
    undefined,
    'medium',
    { automationPrompt: automation.config.prompt }
  )) {
    if (chunk.type === 'message_end') transcript += messageText(chunk.message)
    if (chunk.type === 'tool_execution_start' && chunk.toolName === 'write') {
      transcript += argumentStrings(chunk.args)
    }
  }
  return { kind: 'report', contenu: reportArticle(transcript) }
}

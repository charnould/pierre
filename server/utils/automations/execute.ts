import type { AiStreamMessage } from '../../../shared/ai-stream-events'
import type { AutomationRecord } from '../../../shared/automations'
import { streamCopilot } from '../copilot-agent'
import { WORKFLOW_USER_PROMPT } from '../workflow-payload'
import { AutomationsError } from './store'

type ReportStream = typeof streamCopilot

function messageText(message: AiStreamMessage): string {
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/** The stored report is the single article in the final assistant message. */
function reportArticle(text: string): string {
  const articles = [...text.matchAll(/<article\b([^>]*)>[\s\S]*?<\/article>/gi)].filter((match) =>
    /\bclass\s*=\s*["'][^"']*\breport\b/.test(match[1] ?? '')
  )
  if (articles.length !== 1) throw new AutomationsError('Rapport invalide.', 'unavailable')
  return articles[0]![0]
}

export async function execute_automation(
  automation: AutomationRecord,
  context: { runToken: string; signal: AbortSignal },
  stream: ReportStream = streamCopilot
): Promise<{ kind: 'report'; contenu: string }> {
  let lastMessage = ''
  for await (const chunk of stream(
    Bun.randomUUIDv7(),
    'report',
    WORKFLOW_USER_PROMPT,
    undefined,
    context.signal,
    undefined,
    undefined,
    {
      automationPrompt: automation.config.prompt,
      usage: {
        operation: 'automation',
        userEmail: automation.owner,
        automationId: automation.id
      }
    }
  )) {
    if (chunk.type === 'message_end') lastMessage = messageText(chunk.message)
  }
  return { kind: 'report', contenu: reportArticle(lastMessage) }
}

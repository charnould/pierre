import type { AskUserAnswer } from '../../../../shared/ai-stream-events'

function isAskUserAnswer(value: unknown): value is AskUserAnswer {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['question'] === 'string' &&
    typeof (value as Record<string, unknown>)['answer'] === 'string'
  )
}

function parseAskUserAnswerArray(value: unknown): AskUserAnswer[] | null {
  return Array.isArray(value) && value.length > 0 && value.every(isAskUserAnswer) ? value : null
}

/** Reads ask_user's structured result without exposing its raw JSON transport. */
export function readAskUserAnswers(result: unknown): AskUserAnswer[] | null {
  const direct = parseAskUserAnswerArray(result)
  if (direct) return direct
  if (!result || typeof result !== 'object') return null

  const record = result as Record<string, unknown>
  const details = record['details']
  if (details && typeof details === 'object') {
    const answers = parseAskUserAnswerArray((details as Record<string, unknown>)['answers'])
    if (answers) return answers
  }

  const content = record['content']
  if (!Array.isArray(content)) return null
  const text = content
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        (part as Record<string, unknown>)['type'] === 'text' &&
        typeof (part as Record<string, unknown>)['text'] === 'string'
    )
    .map((part) => part.text)
    .join('')
  if (!text) return null

  try {
    return parseAskUserAnswerArray(JSON.parse(text))
  } catch {
    return null
  }
}

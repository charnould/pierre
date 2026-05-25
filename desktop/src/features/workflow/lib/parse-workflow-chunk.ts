/**
 * Parses one NDJSON line from `/ai` and `/ai/answer` streams.
 * Canonical protocol: `{ type, content? }`.
 */
export type AiStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'reasoning_delta'; content: string }
  | { type: 'reset' }
  | { type: 'done'; content: string }
  | { type: 'error' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStreamPayload(raw: unknown): AiStreamEvent | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null

  switch (raw.type) {
    case 'reasoning_delta':
      return typeof raw.content === 'string' && raw.content.length > 0
        ? { type: 'reasoning_delta', content: raw.content }
        : null
    case 'delta':
      return typeof raw.content === 'string' && raw.content.length > 0
        ? { type: 'delta', content: raw.content }
        : null
    case 'reset':
      return { type: 'reset' }
    case 'done':
      return typeof raw.content === 'string' ? { type: 'done', content: raw.content } : null
    case 'error':
      return { type: 'error' }
    default:
      return null
  }
}

/**
 * @returns A parsed event, or `null` if the line is empty or not valid JSON.
 */
export function parseAiStreamLine(line: string): AiStreamEvent | null {
  const t = line.trim()
  if (!t) return null
  try {
    return parseStreamPayload(JSON.parse(t))
  } catch {
    if (t.includes('pierre_error')) return { type: 'error' }
  }
  return null
}

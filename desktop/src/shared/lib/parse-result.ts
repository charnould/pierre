const ARTIFACT_CLOSE = '</artifact>'

export type ParsedWorkflowResult = {
  output: string
  subject: string
  raw: string
}

export const TICKET_ANSWER_SKILL = 'ticket.answer-ticket'

function extractArtifact(name: string, content: string, streaming: boolean): string {
  const openRe = new RegExp(`<artifact\\s+name=["']${name}["']\\s*>`, 'i')
  const match = openRe.exec(content)
  if (!match) return ''
  const start = match.index + match[0].length
  const closeIdx = content.indexOf(ARTIFACT_CLOSE, start)
  const end = closeIdx !== -1 ? closeIdx : streaming ? content.length : -1
  if (end === -1) return ''
  return content.slice(start, end).trim()
}

function stripArtifactTags(content: string): string {
  let out = content
  for (const re of [
    /<artifact\s+name=["'][^"']+["']\s*>[\s\S]*?<\/artifact>/gi,
    /<artifact\s+name=["'][^"']+["']\s*>[\s\S]*$/gi
  ]) {
    out = out.replace(re, '')
  }
  return out.trim()
}

function parseTicketAnswer(raw: string, streaming: boolean): ParsedWorkflowResult {
  const subject = extractArtifact('subject', raw, streaming)
  const openRe = /<artifact\s+name=["']subject["']\s*>/i
  const match = openRe.exec(raw)
  let output = ''
  if (match) {
    const afterOpen = match.index + match[0].length
    const closeIdx = raw.indexOf(ARTIFACT_CLOSE, afterOpen)
    if (closeIdx !== -1) {
      output = raw.slice(closeIdx + ARTIFACT_CLOSE.length).trimStart()
    }
  } else if (!streaming) {
    output = stripArtifactTags(raw)
  }
  return { output, subject, raw }
}

function parsePlain(raw: string, streaming = false): ParsedWorkflowResult {
  const legacyOutput = extractArtifact('output', raw, streaming)
  const trimmed = legacyOutput || stripArtifactTags(raw)
  return { output: trimmed, subject: '', raw }
}

export function parseWorkflowStream(
  raw: string,
  skillId: string,
  streaming = false
): ParsedWorkflowResult {
  if (skillId === TICKET_ANSWER_SKILL) return parseTicketAnswer(raw, streaming)
  return parsePlain(raw, streaming)
}

export function serializeTicketAnswer(input: { subject: string; body: string }): string {
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject) return body
  return `<artifact name="subject">${subject}</artifact>\n${body}`
}

export function resolveDraftContent(draft: {
  generated_output: string | null
  edited_output: string | null
}): { body: string; subject: string } {
  const raw = draft.edited_output ?? draft.generated_output ?? ''
  const parsed = parseTicketAnswer(raw, false)
  return { body: parsed.output, subject: parsed.subject }
}

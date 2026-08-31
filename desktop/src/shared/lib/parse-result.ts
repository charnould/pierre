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

function parsePlain(raw: string): ParsedWorkflowResult {
  return { output: stripArtifactTags(raw), subject: '', raw }
}

export function parseWorkflowStream(
  raw: string,
  skillId: string,
  streaming = false
): ParsedWorkflowResult {
  if (skillId === TICKET_ANSWER_SKILL) return parseTicketAnswer(raw, streaming)
  return parsePlain(raw)
}

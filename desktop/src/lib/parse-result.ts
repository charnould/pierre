type ArtifactName = 'analysis' | 'response'

const ARTIFACT_OPEN = /<artifact\s+name=["'](analysis|response)["']\s*>/gi

function extractArtifactBlock(content: string, name: ArtifactName, streaming: boolean): string {
  ARTIFACT_OPEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ARTIFACT_OPEN.exec(content)) !== null) {
    if (match[1].toLowerCase() !== name) continue
    const start = match.index + match[0].length
    const closeIdx = content.indexOf('</artifact>', start)
    const end = closeIdx !== -1 ? closeIdx : streaming ? content.length : -1
    if (end === -1) continue
    return content.slice(start, end).trim()
  }
  return ''
}

/**
 * Parses a complete workflow response from `<artifact name="…">` blocks.
 */
export function parseResult(content: string): { analysis: string; response: string } {
  return {
    analysis: extractArtifactBlock(content, 'analysis', false),
    response: extractArtifactBlock(content, 'response', false)
  }
}

/**
 * Streaming variant: partial content before closing `</artifact>`.
 */
export function parseStreamingResult(content: string): { analysis: string; response: string } {
  return {
    analysis: extractArtifactBlock(content, 'analysis', true),
    response: extractArtifactBlock(content, 'response', true)
  }
}

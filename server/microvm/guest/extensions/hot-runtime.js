import { readFileSync } from 'node:fs'

const AGENTS_PATH = '/work/AGENTS.md'

export default function hotRuntimeExtension(pi) {
  const warmUrl = process.env.PIERRE_WARM_URL
  if (warmUrl) {
    fetch(warmUrl, { method: 'HEAD', signal: AbortSignal.timeout(5_000) }).catch(() => {})
  }

  let cached = null

  pi.on('before_agent_start', (event) => {
    const files = event.systemPromptOptions?.contextFiles
    if (!Array.isArray(files) || files.some((file) => file?.path === AGENTS_PATH)) return
    if (cached === null) {
      try {
        cached = readFileSync(AGENTS_PATH, 'utf8').replace(/^\uFEFF/, '')
      } catch {
        return
      }
    }
    files.push({ path: AGENTS_PATH, content: cached })
  })
}

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { releaseParts, versionGreater } from './release-tag.ts'

export const SPEECH_MODEL_FILE = 'model.gguf'

export function speechInstalled(dir: string, tag: string): boolean {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp) || readFileSync(stamp, 'utf8').trim() !== tag) return false
  try {
    return statSync(join(dir, SPEECH_MODEL_FILE)).size > 0
  } catch {
    return false
  }
}

export function latestSpeechTag(tags: readonly string[]): string {
  let best = ''
  for (const tag of tags) {
    if (!tag.startsWith('speech-') || !releaseParts(tag)) continue
    if (!best || versionGreater(tag, best)) best = tag
  }
  return best
}

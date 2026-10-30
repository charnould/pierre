import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { releaseParts, versionGreater } from './release-tag.ts'

export const CARL_MODEL_FILES = [
  'model.onnx',
  'labels.json',
  'tokenizer.json',
  'tokenizer_config.json'
] as const

export function carlInstalled(dir: string, tag: string): boolean {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp) || readFileSync(stamp, 'utf8').trim() !== tag) return false
  return CARL_MODEL_FILES.every((name) => existsSync(join(dir, name)))
}

export function latestCarlTag(tags: readonly string[]): string {
  let best = ''
  for (const tag of tags) {
    if (!tag.startsWith('carl-') || !releaseParts(tag)) continue
    if (!best || versionGreater(tag, best)) best = tag
  }
  return best
}

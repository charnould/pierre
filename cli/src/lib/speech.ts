import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

import type { Release } from '../../../shared/github-releases.ts'
import { SPEECH_MODEL_FILE, speechInstalled } from '../../../shared/speech-model.ts'
import { assetSha256, expectSha256, fetchReleases, fetchTo, selectSpeechRelease } from './github.ts'
import type { Context } from './system.ts'

export type SpeechInstall = {
  status: 'current' | 'installed' | 'unchanged' | 'unavailable'
  tag: string
}

function installedTag(dir: string): string {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp)) return ''
  const tag = readFileSync(stamp, 'utf8').trim()
  return tag && speechInstalled(dir, tag) ? tag : ''
}

async function installModel(ctx: Context, release: Release) {
  const dir = join(ctx.runtime.paths.home, 'models', 'speech')
  if (speechInstalled(dir, release.tag)) return
  const parent = join(ctx.runtime.paths.home, 'models')
  mkdirSync(parent, { recursive: true })
  const stage = mkdtempSync(join(parent, '.speech-'))
  try {
    const file = join(stage, SPEECH_MODEL_FILE)
    const expected = await assetSha256(ctx, release.tag, SPEECH_MODEL_FILE, release)
    await fetchTo(ctx, SPEECH_MODEL_FILE, file, release.tag)
    await expectSha256(SPEECH_MODEL_FILE, file, expected)
    const stamp = join(stage, 'version')
    writeFileSync(stamp, `${release.tag}\n`)
    chmodSync(stamp, 0o644)
    const previous = join(parent, `.speech-previous-${crypto.randomUUID()}`)
    const hadCurrent = existsSync(dir)
    if (hadCurrent) renameSync(dir, previous)
    try {
      renameSync(stage, dir)
    } catch (error) {
      if (hadCurrent) renameSync(previous, dir)
      throw error
    }
    if (hadCurrent) rmSync(previous, { recursive: true, force: true })
  } catch (error) {
    rmSync(stage, { recursive: true, force: true })
    throw error
  }
}

export async function ensureLatestSpeech(ctx: Context): Promise<SpeechInstall> {
  const dir = join(ctx.runtime.paths.home, 'models', 'speech')
  const release = selectSpeechRelease(await fetchReleases(ctx))
  if (!release) {
    const tag = installedTag(dir)
    return { status: tag ? 'unchanged' : 'unavailable', tag }
  }
  if (speechInstalled(dir, release.tag)) return { status: 'current', tag: release.tag }
  await installModel(ctx, release)
  return { status: 'installed', tag: release.tag }
}

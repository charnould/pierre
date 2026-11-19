import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { listGitHubReleases, type Release } from '../../shared/github-releases'
import { latestSpeechTag, SPEECH_MODEL_FILE, speechInstalled } from '../../shared/speech-model'
import { SPEECH_DIR } from './paths'

const ARCHIVE = 'https://github.com/charnould/pierre/releases/download'
const SHA256 = /^[a-f0-9]{64}$/

async function latestRelease(): Promise<Release | null> {
  const releases = await listGitHubReleases(async (url) => {
    const response = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'pierre' }
    })
    return { status: response.status, body: await response.text() }
  })
  const tag = latestSpeechTag(
    releases.filter((release) => !release.draft).map((release) => release.tag)
  )
  if (!tag) return null
  return releases.find((release) => release.tag === tag && !release.draft) ?? null
}

async function sha256(file: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256')
  for await (const chunk of Bun.file(file).stream()) hasher.update(chunk)
  return hasher.digest('hex')
}

async function installRelease(dir: string, release: Release): Promise<void> {
  const digest = release.assets.find((asset) => asset.name === SPEECH_MODEL_FILE)?.sha256 ?? ''
  if (!SHA256.test(digest)) throw new Error(`Empreinte absente pour ${SPEECH_MODEL_FILE}.`)
  const parent = join(dir, '..')
  mkdirSync(parent, { recursive: true })
  const stage = await mkdtemp(join(tmpdir(), 'pierre-speech-'))
  try {
    const response = await fetch(`${ARCHIVE}/${release.tag}/${SPEECH_MODEL_FILE}`, {
      headers: { 'user-agent': 'pierre' }
    })
    if (!response.ok) throw new Error(`Téléchargement de ${release.tag} impossible.`)
    const file = join(stage, SPEECH_MODEL_FILE)
    await Bun.write(file, response)
    if ((await sha256(file)) !== digest)
      throw new Error(`Empreinte incorrecte pour ${SPEECH_MODEL_FILE}.`)
    const stamp = join(stage, 'version')
    writeFileSync(stamp, `${release.tag}\n`)
    chmodSync(stamp, 0o644)
    const previous = `${dir}.previous`
    rmSync(previous, { recursive: true, force: true })
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

export async function ensureSpeech(dir = SPEECH_DIR): Promise<void> {
  let release: Release | null
  try {
    release = await latestRelease()
  } catch (error) {
    if (existsSync(join(dir, SPEECH_MODEL_FILE))) {
      const message =
        error instanceof Error ? error.message : 'Impossible de lire les releases GitHub.'
      console.warn(`${message} Le modèle de dictée déjà installé est conservé.`)
      return
    }
    throw error
  }
  if (!release) {
    console.warn("Aucune version de dictée vocale n'est publiée.")
    return
  }
  if (speechInstalled(dir, release.tag)) return
  console.log(`Téléchargement de ${release.tag}…`)
  await installRelease(dir, release)
}

if (import.meta.main) {
  ensureSpeech().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'La dictée vocale est indisponible.')
    process.exit(1)
  })
}

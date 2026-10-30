import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CARL_MODEL_FILES, carlInstalled, latestCarlTag } from '../../shared/carl-model'
import { listGitHubReleases, type Release } from '../../shared/github-releases'
import { CARL_DIR } from './paths'

const ARCHIVE = 'https://github.com/charnould/pierre/releases/download'
const SHA256 = /^[a-f0-9]{64}$/

async function latestRelease(): Promise<Release | null> {
  const releases = await listGitHubReleases(async (url) => {
    const response = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'pierre' }
    })
    return { status: response.status, body: await response.text() }
  })
  const tag = latestCarlTag(
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
  const digest = release.assets.find((asset) => asset.name === 'model.zip')?.sha256 ?? ''
  if (!SHA256.test(digest)) throw new Error('Empreinte absente pour model.zip.')
  const temp = await mkdtemp(join(tmpdir(), 'pierre-carl-'))
  try {
    const response = await fetch(`${ARCHIVE}/${release.tag}/model.zip`, {
      headers: { 'user-agent': 'pierre' }
    })
    if (!response.ok) throw new Error(`Téléchargement de carl ${release.tag} impossible.`)
    const zip = join(temp, 'model.zip')
    await Bun.write(zip, response)
    if ((await sha256(zip)) !== digest) throw new Error('Empreinte incorrecte pour model.zip.')
    const extracted = join(temp, 'out')
    mkdirSync(extracted)
    const unzip = Bun.spawn(['unzip', '-oq', zip, '-d', extracted], {
      stdout: 'ignore',
      stderr: 'pipe'
    })
    const stderr = await new Response(unzip.stderr).text()
    if ((await unzip.exited) !== 0) {
      throw new Error(stderr.trim() || `L'archive de carl ${release.tag} est illisible.`)
    }
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(extracted, name))) throw new Error(`L'archive ne contient pas ${name}.`)
    }
    mkdirSync(dir, { recursive: true })
    for (const entry of readdirSync(extracted)) {
      cpSync(join(extracted, entry), join(dir, entry), { recursive: true })
    }
    const stamp = join(dir, 'version')
    writeFileSync(stamp, `${release.tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(join(dir, 'model.sha256'), { force: true })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

export async function ensureCarl(dir = CARL_DIR): Promise<void> {
  const release = await latestRelease()
  if (!release) throw new Error("Aucune version de carl n'est publiée.")
  if (carlInstalled(dir, release.tag)) return
  console.log(`Téléchargement de carl ${release.tag}…`)
  await installRelease(dir, release)
}

if (import.meta.main) {
  ensureCarl().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Carl est indisponible.')
    process.exit(1)
  })
}

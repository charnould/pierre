import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CARL_MODEL_FILES, latestCarlTag } from '../../shared/carl-model'
import { CARL_DIR } from './paths'

const API = 'https://api.github.com/repos/charnould/pierre/releases'
const ARCHIVE = 'https://github.com/charnould/pierre/releases/download'

export function carlInstalled(dir: string, tag: string): boolean {
  const stamp = join(dir, 'version')
  if (!existsSync(stamp) || readFileSync(stamp, 'utf8').trim() !== tag) return false
  return CARL_MODEL_FILES.every((name) => existsSync(join(dir, name)))
}

async function publishedTags(): Promise<string[]> {
  const tags: string[] = []
  for (let page = 1; page <= 5; page += 1) {
    const response = await fetch(`${API}?per_page=100&page=${page}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'pierre' }
    })
    if (!response.ok) break
    const parsed: unknown = await response.json()
    if (!Array.isArray(parsed) || parsed.length === 0) break
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as { tag_name?: unknown; draft?: unknown }
      if (record.draft === true || typeof record.tag_name !== 'string') continue
      tags.push(record.tag_name)
    }
    if (parsed.length < 100) break
  }
  return tags
}

async function installTag(dir: string, tag: string): Promise<void> {
  const temp = await mkdtemp(join(tmpdir(), 'pierre-carl-'))
  try {
    const response = await fetch(`${ARCHIVE}/${tag}/model.zip`, {
      headers: { 'user-agent': 'pierre' }
    })
    if (!response.ok) throw new Error(`Téléchargement de carl ${tag} impossible.`)
    const zip = join(temp, 'model.zip')
    await Bun.write(zip, response)
    const extracted = join(temp, 'out')
    mkdirSync(extracted)
    const unzip = Bun.spawn(['unzip', '-oq', zip, '-d', extracted], {
      stdout: 'ignore',
      stderr: 'pipe'
    })
    const stderr = await new Response(unzip.stderr).text()
    if ((await unzip.exited) !== 0) {
      throw new Error(stderr.trim() || `L'archive de carl ${tag} est illisible.`)
    }
    for (const name of CARL_MODEL_FILES) {
      if (!existsSync(join(extracted, name))) throw new Error(`L'archive ne contient pas ${name}.`)
    }
    mkdirSync(dir, { recursive: true })
    for (const entry of readdirSync(extracted)) {
      cpSync(join(extracted, entry), join(dir, entry), { recursive: true })
    }
    const stamp = join(dir, 'version')
    writeFileSync(stamp, `${tag}\n`)
    chmodSync(stamp, 0o644)
    rmSync(join(dir, 'model.sha256'), { force: true })
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

export async function ensureCarl(dir = CARL_DIR): Promise<void> {
  const tag = latestCarlTag(await publishedTags())
  if (!tag) throw new Error("Aucune version de carl n'est publiée.")
  if (carlInstalled(dir, tag)) return
  console.log(`Téléchargement de carl ${tag}…`)
  await installTag(dir, tag)
}

if (import.meta.main) {
  ensureCarl().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Carl est indisponible.')
    process.exit(1)
  })
}

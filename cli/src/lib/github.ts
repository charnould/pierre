import { createHash } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'

import type { Context } from './system.ts'
import { CommandFailed } from './system.ts'

const REPO = 'https://github.com/charnould/pierre'
const API = 'https://api.github.com/repos/charnould/pierre'
const SERVER_TAG = /^server-\d+\.\d+\.\d+$/
export const CARL_TAG = /^carl-\d+\.\d+\.\d+$/
const CLI_TAG = /^cli-\d+\.\d+\.\d+$/

export type ReleaseAsset = { name: string; digest: string }
export type Release = {
  tag: string
  draft: boolean
  prerelease: boolean
  assets: ReleaseAsset[]
}

const numericPart = (value: string | undefined): number | null => {
  if (value === undefined || value === '') return 0
  if (!/^\d+$/.test(value)) return null
  return Number.parseInt(value, 10)
}

const pieces = (value: string): Array<number | null> => {
  const normalized = value.replace(/^(?:carl|cli|server)-/, '')
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(normalized)
  if (!match) return [null, null, null]
  return [numericPart(match[1]), numericPart(match[2]), numericPart(match[3])]
}

export function versionGreater(left: string, right: string): boolean {
  const a = pieces(left)
  const b = pieces(right)
  for (let index = 0; index < 3; index += 1) {
    const x = a[index] ?? null
    const y = b[index] ?? null
    if (x === null || y === null) return false
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

export function latestMatching(tags: string[], pattern: RegExp): string {
  let best = ''
  for (const tag of tags) {
    if (!pattern.test(tag)) continue
    if (!best || versionGreater(tag, best)) best = tag
  }
  return best
}

export function tagsDescending(tags: string[], pattern: RegExp): string[] {
  return tags
    .filter((tag) => pattern.test(tag))
    .sort((left, right) => (versionGreater(left, right) ? -1 : versionGreater(right, left) ? 1 : 0))
}

const maxRelease = (releases: Release[]): Release | null => {
  let best: Release | null = null
  for (const release of releases) {
    if (!best || versionGreater(release.tag, best.tag)) best = release
  }
  return best
}

export function selectServerRelease(releases: Release[]): Release | null {
  return maxRelease(
    releases.filter(
      (release) => !release.draft && !release.prerelease && SERVER_TAG.test(release.tag)
    )
  )
}

export function selectCarlRelease(releases: Release[]): Release | null {
  return maxRelease(releases.filter((release) => !release.draft && CARL_TAG.test(release.tag)))
}

export function selectCliRelease(releases: Release[]): Release | null {
  return maxRelease(
    releases.filter((release) => !release.draft && !release.prerelease && CLI_TAG.test(release.tag))
  )
}

const parseAssets = (value: unknown): ReleaseAsset[] => {
  if (!Array.isArray(value)) return []
  const assets: ReleaseAsset[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const name = typeof record['name'] === 'string' ? record['name'] : ''
    const digest = typeof record['digest'] === 'string' ? record['digest'] : ''
    if (name) assets.push({ name, digest })
  }
  return assets
}

export async function fetchReleases(ctx: Context): Promise<Release[]> {
  const releases: Release[] = []
  for (let page = 1; page <= 5; page += 1) {
    const response = await ctx.runtime.request(`${API}/releases?per_page=100&page=${page}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'pierre-cli'
      },
      timeoutMs: 10_000
    })
    if (response.status !== 200) break
    let parsed: unknown
    try {
      parsed = JSON.parse(response.body)
    } catch {
      break
    }
    if (!Array.isArray(parsed) || parsed.length === 0) break
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const tag = typeof record['tag_name'] === 'string' ? record['tag_name'] : ''
      if (!tag) continue
      releases.push({
        tag,
        draft: record['draft'] === true,
        prerelease: record['prerelease'] === true,
        assets: parseAssets(record['assets'])
      })
    }
    if (parsed.length < 100) break
  }
  return releases
}

function assetUrl(name: string, release: string): string {
  return `${REPO}/releases/download/${release}/${name}`
}

export async function fetchTo(ctx: Context, name: string, dest: string, release: string) {
  const directory = ctx.runtime.env['PIERRE_ASSET_DIR']
  mkdirSync(dirname(dest), { recursive: true })
  if (directory) {
    const source = join(directory, name)
    if (existsSync(source)) {
      copyFileSync(source, dest)
      return
    }
  }
  const partial = `${dest}.partial`
  rmSync(partial, { force: true })
  try {
    await ctx.runtime.download(assetUrl(name, release), partial)
    renameSync(partial, dest)
  } catch (error) {
    rmSync(partial, { force: true })
    const message = error instanceof Error ? error.message : 'Téléchargement impossible.'
    throw new CommandFailed(1, message)
  }
}

export function fileSha256(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

export async function releaseAssetDigests(
  ctx: Context,
  tag: string,
  expectedNames: string[]
): Promise<Record<string, string>> {
  if (ctx.runtime.env['PIERRE_ASSET_DIR']) return {}
  const response = await ctx.runtime.request(`${API}/releases/tags/${tag}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'pierre-cli' },
    timeoutMs: 10_000
  })
  if (response.status !== 200) {
    throw new CommandFailed(1, `Impossible de vérifier les assets de ${tag}.`)
  }
  let assets: ReleaseAsset[]
  try {
    const parsed = JSON.parse(response.body) as { assets?: unknown }
    assets = parseAssets(parsed.assets)
  } catch {
    throw new CommandFailed(1, `Les assets de ${tag} sont invalides.`)
  }
  const actualNames = assets.map((asset) => asset.name).sort()
  const expected = [...expectedNames].sort()
  if (actualNames.join('\n') !== expected.join('\n')) {
    throw new CommandFailed(1, `La release ${tag} est incomplète.`)
  }
  const digests: Record<string, string> = {}
  for (const name of expected) {
    const digest = assets.find((asset) => asset.name === name)?.digest ?? ''
    if (!digest.startsWith('sha256:') || digest.length !== 'sha256:'.length + 64) {
      throw new CommandFailed(1, `Empreinte invalide pour ${name}.`)
    }
    digests[name] = digest
  }
  return digests
}

export async function verifyFileDigest(name: string, file: string, digest: string) {
  if ((await fileSha256(file)) !== digest.slice('sha256:'.length)) {
    throw new CommandFailed(1, `Empreinte incorrecte pour ${name}.`)
  }
}

export async function verifyChecksum(checksums: string, name: string, file: string) {
  const expected = checksums
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find((fields) => fields[1] === name || fields[1] === `*${name}`)?.[0]
  if (!expected || (await fileSha256(file)) !== expected) {
    throw new CommandFailed(1, `L'empreinte de ${name} est invalide.`)
  }
}

function versionToken(output: string): string {
  return output.trim().split(/\s+/)[0] ?? ''
}

export async function commandVersion(ctx: Context, file: string): Promise<string> {
  chmodSync(file, 0o755)
  const result = await ctx.runtime.start(file, ['--version']).finished
  return versionToken(result.stdout)
}

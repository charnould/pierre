import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { latestCarlTag } from '../../../shared/carl-model.ts'
import {
  listGitHubReleases,
  parseGitHubRelease,
  type Release
} from '../../../shared/github-releases.ts'
import { releaseParts, versionGreater } from '../../../shared/release-tag.ts'
import { CommandFailed, type Context } from './system.ts'

const REPO = 'https://github.com/charnould/pierre'
const API = 'https://api.github.com/repos/charnould/pierre'
const HEADERS = { accept: 'application/vnd.github+json', 'user-agent': 'pierre-cli' }
const SHA256 = /^[a-f0-9]{64}$/
const SERVER_TAG = /^server-\d+\.\d+\.\d+$/
const CLI_TAG = /^cli-\d+\.\d+\.\d+$/

export type { Release }
export { releaseParts, versionGreater }

export function selectServerRelease(releases: Release[]): Release | null {
  return maxRelease(
    releases.filter(
      (release) => !release.draft && !release.prerelease && SERVER_TAG.test(release.tag)
    )
  )
}

export function selectCarlRelease(releases: Release[]): Release | null {
  const tag = latestCarlTag(
    releases.filter((release) => !release.draft).map((release) => release.tag)
  )
  if (!tag) return null
  return releases.find((release) => release.tag === tag && !release.draft) ?? null
}

export function selectCliRelease(releases: Release[]): Release | null {
  return maxRelease(
    releases.filter((release) => !release.draft && !release.prerelease && CLI_TAG.test(release.tag))
  )
}

export function assetDirectory(ctx: Context): string {
  const fromEnv = ctx.runtime.env['PIERRE_ASSET_DIR']
  if (fromEnv) return fromEnv
  const file = ctx.runtime.paths.assetSourceFile
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8').split('\n')[0]?.trim() ?? ''
}

export async function fetchReleases(ctx: Context): Promise<Release[]> {
  try {
    return await listGitHubReleases((url) => request(ctx, url))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossible de lire les releases GitHub.'
    throw new CommandFailed(1, message)
  }
}

export async function fetchRelease(ctx: Context, tag: string): Promise<Release> {
  const response = await request(ctx, `${API}/releases/tags/${tag}`)
  if (response.status !== 200) throw new CommandFailed(1, `Impossible de lire la release ${tag}.`)
  let parsed: unknown
  try {
    parsed = JSON.parse(response.body)
  } catch {
    throw new CommandFailed(1, `La release ${tag} est illisible.`)
  }
  const release = parseGitHubRelease(parsed)
  if (!release || release.tag !== tag)
    throw new CommandFailed(1, `La release ${tag} est illisible.`)
  return release
}

export async function assetSha256(
  ctx: Context,
  tag: string,
  name: string,
  release?: Release
): Promise<string> {
  const local = assetDirectory(ctx)
  if (local) return checksumFor(await Bun.file(join(local, 'checksums.txt')).text(), name)
  const listed = sha256Of(release, name)
  if (listed) return listed
  const fetched = sha256Of(await fetchRelease(ctx, tag), name)
  if (!fetched) throw new CommandFailed(1, `Empreinte absente pour ${name}.`)
  return fetched
}

export async function fetchTo(ctx: Context, name: string, dest: string, release: string) {
  const directory = assetDirectory(ctx)
  mkdirSync(dirname(dest), { recursive: true })
  if (directory) {
    const source = join(directory, name)
    if (existsSync(source)) {
      await Bun.write(dest, Bun.file(source))
      return
    }
  }
  const partial = `${dest}.partial`
  rmSync(partial, { force: true })
  try {
    await ctx.runtime.download(`${REPO}/releases/download/${release}/${name}`, partial)
    renameSync(partial, dest)
  } catch (error) {
    rmSync(partial, { force: true })
    const message = error instanceof Error ? error.message : 'Téléchargement impossible.'
    throw new CommandFailed(1, message)
  }
}

export async function fileSha256(file: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256')
  for await (const chunk of Bun.file(file).stream()) hasher.update(chunk)
  return hasher.digest('hex')
}

export function checksumFor(checksums: string, name: string): string {
  const sha256 = checksumEntries(checksums).find((entry) => entry.name === name)?.sha256
  if (!sha256) throw new CommandFailed(1, `Empreinte absente pour ${name}.`)
  return sha256
}

export async function expectSha256(name: string, file: string, expected: string) {
  if ((await fileSha256(file)) !== expected) {
    throw new CommandFailed(1, `Empreinte incorrecte pour ${name}.`)
  }
}

export async function verifyChecksumFile(directory: string, checksums: string) {
  const entries = checksumEntries(checksums)
  for (const entry of entries) {
    await expectSha256(entry.name, join(directory, entry.name), entry.sha256)
  }
}

export async function commandVersion(ctx: Context, file: string): Promise<string> {
  const result = await ctx.runtime.start(file, ['--version']).finished
  if (result.code !== 0) throw new CommandFailed(result.code, 'Version illisible.')
  return result.stdout.trim().split(/\s+/)[0] ?? ''
}

function sha256Of(release: Release | undefined, name: string): string {
  const sha256 = release?.assets.find((asset) => asset.name === name)?.sha256 ?? ''
  return SHA256.test(sha256) ? sha256 : ''
}

function request(ctx: Context, url: string) {
  return ctx.runtime.request(url, { headers: HEADERS, timeoutMs: 10_000 })
}

function maxRelease(releases: Release[]): Release | null {
  let best: Release | null = null
  for (const release of releases) {
    if (!best || versionGreater(release.tag, best.tag)) best = release
  }
  return best
}

function checksumEntries(checksums: string): Array<{ name: string; sha256: string }> {
  const entries: Array<{ name: string; sha256: string }> = []
  for (const raw of checksums.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const fields = line.split(/\s+/)
    const sha256 = fields[0] ?? ''
    const name = fields[1]?.replace(/^\*/, '') ?? ''
    if (!SHA256.test(sha256) || !name) throw new CommandFailed(1, 'Somme de contrôle illisible.')
    entries.push({ name, sha256 })
  }
  if (entries.length === 0) throw new CommandFailed(1, 'Somme de contrôle illisible.')
  return entries
}

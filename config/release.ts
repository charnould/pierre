import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { appendFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export type Product = 'cli' | 'desktop' | 'server'

type ReleaseAsset = { name: string; digest?: string }
type ReleaseInfo = {
  assets: ReleaseAsset[]
  body: string
  isDraft: boolean
  isPrerelease: boolean
  name: string
}
type ReleasePolicy = {
  assets: (version: string) => string[]
  notes: string
  packagePath: string
  prefix: string
  sourcePaths: string[]
  title: (tag: string) => string
}
type CommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const POLICIES: Record<Product, ReleasePolicy> = {
  cli: {
    assets: () => ['checksums.txt', 'install.sh', 'pierre-cli-linux-x64'],
    notes:
      'Interface en ligne de commande (cli) pour l’installation, la configuration et la mise à jour de PIERRE (serveur)',
    packagePath: 'cli/package.json',
    prefix: 'cli-',
    sourcePaths: ['cli/package.json', 'server/microvm/versions.json'],
    title: (tag) => tag
  },
  desktop: {
    assets: (version) => [
      'RELEASES',
      `pierre-${version}-full.nupkg`,
      'pierre-macos-arm64.zip',
      'pierre-macos.dmg',
      'pierre-win32-setup.exe'
    ],
    notes: '',
    packagePath: 'desktop/package.json',
    // update.electronjs.org ignores prefixed tags.
    prefix: '',
    sourcePaths: ['desktop/package.json'],
    title: (tag) => `desktop-${tag}`
  },
  server: {
    assets: () => ['libonnxruntime.so.1', 'pierre', 'pierre-linux-amd64.smolmachine'],
    notes: 'Serveur PIERRE et bibliothèque ONNX Runtime',
    packagePath: 'server/package.json',
    prefix: 'server-',
    sourcePaths: ['server/package.json', 'server/microvm'],
    title: (tag) => tag
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function packageVersion(value: unknown): string {
  return isRecord(value) && typeof value['version'] === 'string' ? value['version'] : ''
}

function parseReleaseInfo(value: unknown): ReleaseInfo {
  if (
    !isRecord(value) ||
    !Array.isArray(value['assets']) ||
    typeof value['body'] !== 'string' ||
    typeof value['name'] !== 'string'
  ) {
    throw new Error('Invalid GitHub release response')
  }
  const assets = value['assets'].map((asset): ReleaseAsset => {
    if (!isRecord(asset) || typeof asset['name'] !== 'string') {
      throw new Error('Invalid GitHub release asset')
    }
    return {
      name: asset['name'],
      ...(typeof asset['digest'] === 'string' && { digest: asset['digest'] })
    }
  })
  if (typeof value['isDraft'] !== 'boolean' || typeof value['isPrerelease'] !== 'boolean') {
    throw new Error('Invalid GitHub release state')
  }
  return {
    assets,
    body: value['body'],
    isDraft: value['isDraft'],
    isPrerelease: value['isPrerelease'],
    name: value['name']
  }
}

function versionParts(value: string): [number, number, number] {
  const match = SEMVER.exec(value)
  if (!match) throw new Error(`Invalid semantic version: ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function command(args: string[]): CommandResult {
  const result = Bun.spawnSync({
    cmd: args,
    env: process.env,
    stderr: 'pipe',
    stdout: 'pipe'
  })
  return {
    exitCode: result.exitCode,
    stderr: new TextDecoder().decode(result.stderr),
    stdout: new TextDecoder().decode(result.stdout)
  }
}

function must(args: string[]): string {
  const result = command(args)
  if (result.exitCode !== 0) {
    throw new Error(`${args.join(' ')}\n${result.stderr.trim()}`)
  }
  return result.stdout.trim()
}

export function isExactSemver(value: string): boolean {
  return SEMVER.test(value)
}

export function compareVersions(left: string, right: string): number {
  const a = versionParts(left)
  const b = versionParts(right)
  for (const index of [0, 1, 2] as const) {
    if (a[index] > b[index]) return 1
    if (a[index] < b[index]) return -1
  }
  return 0
}

function productFor(value: string): Product {
  if (value === 'cli' || value === 'desktop' || value === 'server') return value
  throw new Error(`Unknown release product: ${value}`)
}

function versionAt(ref: string, packagePath: string): string {
  const result = command(['git', 'show', `${ref}:${packagePath}`])
  if (result.exitCode !== 0) return ''
  return packageVersion(JSON.parse(result.stdout) as unknown)
}

function tagVersion(tag: string, policy: ReleasePolicy): string {
  if (!tag.startsWith(policy.prefix)) return ''
  const version = tag.slice(policy.prefix.length)
  return isExactSemver(version) ? version : ''
}

function productVersions(policy: ReleasePolicy): string[] {
  return must(['git', 'tag', '--list'])
    .split('\n')
    .map((tag) => tagVersion(tag, policy))
    .filter(Boolean)
    .sort(compareVersions)
}

function releaseInfo(tag: string): ReleaseInfo | null {
  const result = command([
    'gh',
    'release',
    'view',
    tag,
    '--json',
    'assets,body,isDraft,isPrerelease,name'
  ])
  if (result.exitCode !== 0) {
    if (result.stderr.trim() === 'release not found') return null
    throw new Error(`Unable to read release ${tag}\n${result.stderr.trim()}`)
  }
  return parseReleaseInfo(JSON.parse(result.stdout) as unknown)
}

function assertAssets(release: ReleaseInfo, expectedAssets: string[]) {
  const actual = release.assets.map((asset) => asset.name).sort()
  if (actual.join('\n') !== expectedAssets.join('\n')) {
    throw new Error(`Unexpected release assets:\n${actual.join('\n')}`)
  }
}

function assertRelease(release: ReleaseInfo, expectedAssets: string[], expectedTitle: string) {
  assertAssets(release, expectedAssets)
  if (release.name !== expectedTitle) {
    throw new Error(`Unexpected release title: ${release.name}`)
  }
}

const ATTESTATION_START = '<!-- pierre-release-digests\n'
const ATTESTATION_END = '\n-->'

function attestationNotes(notes: string, digests: Record<string, string>): string {
  const prefix = notes ? `${notes}\n\n` : ''
  return `${prefix}${ATTESTATION_START}${JSON.stringify(digests)}${ATTESTATION_END}`
}

function assertAttestation(release: ReleaseInfo, assetNames: string[]) {
  const start = release.body.indexOf(ATTESTATION_START)
  const end = release.body.indexOf(ATTESTATION_END, start)
  if (start < 0 || end < 0) throw new Error('Release digest attestation is missing')
  const encoded = release.body.slice(start + ATTESTATION_START.length, end)
  const expected = JSON.parse(encoded) as Record<string, unknown>
  for (const name of assetNames) {
    const actual = release.assets.find((asset) => asset.name === name)?.digest
    if (typeof expected[name] !== 'string' || actual !== expected[name]) {
      throw new Error(`Release digest attestation mismatch for ${name}`)
    }
  }
}

function output(name: string, value: string) {
  const path = process.env['GITHUB_OUTPUT']
  if (!path) throw new Error('GITHUB_OUTPUT is missing')
  appendFileSync(path, `${name}=${value}\n`)
}

async function currentVersion(policy: ReleasePolicy): Promise<string> {
  const version = packageVersion((await Bun.file(policy.packagePath).json()) as unknown)
  if (!isExactSemver(version)) {
    throw new Error(`${policy.packagePath} must contain an exact semver`)
  }
  return version
}

async function prepare(product: Product) {
  const policy = POLICIES[product]
  const version = await currentVersion(policy)
  const tag = `${policy.prefix}${version}`
  const tagResult = command(['git', 'rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])
  const tagRef = tagResult.exitCode === 0 ? must(['git', 'rev-list', '-n', '1', tag]) : ''
  if (tagRef && versionAt(tagRef, policy.packagePath) !== version) {
    throw new Error(`${tag} does not contain ${policy.packagePath} version ${version}`)
  }
  if (
    tagRef &&
    command(['git', 'diff', '--quiet', tagRef, 'HEAD', '--', ...policy.sourcePaths]).exitCode !== 0
  ) {
    throw new Error(`${product} release inputs changed without a version bump`)
  }

  const versions = productVersions(policy)
  const latest = versions.at(-1) ?? ''
  if (latest && compareVersions(version, latest) < 0) {
    throw new Error(`${version} is older than the latest ${product} tag ${latest}`)
  }
  const previous =
    versions.filter((candidate) => compareVersions(candidate, version) < 0).at(-1) ?? '0.0.0'

  let ref = tagRef
  if (!ref) {
    const head = process.env['GITHUB_SHA'] ?? must(['git', 'rev-parse', 'HEAD'])
    if (versionAt(head, policy.packagePath) !== version) {
      throw new Error(`${head} does not contain ${policy.packagePath} version ${version}`)
    }
    const parentResult = command(['git', 'rev-parse', `${head}^`])
    const previousAtHead =
      parentResult.exitCode === 0
        ? versionAt(parentResult.stdout.trim(), policy.packagePath) || '0.0.0'
        : '0.0.0'
    if (compareVersions(version, previousAtHead) <= 0) {
      throw new Error(`${version} must be greater than ${previousAtHead} in the release commit`)
    }
    if (latest && compareVersions(version, latest) <= 0) {
      throw new Error(`${version} must be greater than the latest ${product} tag ${latest}`)
    }
    ref = head
  }

  const release = releaseInfo(tag)
  const expectedAssets = policy.assets(version).sort()
  const expectedTitle = policy.title(tag)
  if (release && !release.isDraft) {
    if (!tagRef) throw new Error(`${tag} has a public release but no git tag`)
    if (release.isPrerelease) throw new Error(`${tag} is unexpectedly a prerelease`)
    assertRelease(release, expectedAssets, expectedTitle)
    output('publish', 'false')
  } else {
    output('publish', 'true')
  }
  output('previous', previous)
  output('ref', ref)
  output('tag', tag)
  output('version', version)
}

function tagRelease(tag: string, ref: string) {
  const existing = command(['git', 'rev-parse', '--verify', '--quiet', `refs/tags/${tag}`])
  if (existing.exitCode === 0) {
    const sha = must(['git', 'rev-list', '-n', '1', tag])
    if (sha !== ref) throw new Error(`${tag} points to ${sha}, not ${ref}`)
    return
  }
  must(['git', 'tag', tag, ref])
  must(['git', 'push', 'origin', tag])
}

async function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function stage(product: Product, ref: string, assetDirectory: string) {
  const policy = POLICIES[product]
  const version = versionAt(ref, policy.packagePath)
  if (!isExactSemver(version)) throw new Error(`${ref} has no valid ${product} version`)
  const tag = `${policy.prefix}${version}`
  const title = policy.title(tag)
  const assetNames = policy.assets(version).sort()
  const assets = assetNames.map((name) => join(assetDirectory, name))

  for (const asset of assets) {
    if (!(await Bun.file(asset).exists()) || Bun.file(asset).size === 0) {
      throw new Error(`Release asset is missing or empty: ${asset}`)
    }
  }

  tagRelease(tag, ref)
  let release = releaseInfo(tag)
  if (!release) {
    must([
      'gh',
      'release',
      'create',
      tag,
      '--draft',
      '--verify-tag',
      '--title',
      title,
      '--notes',
      policy.notes
    ])
    release = releaseInfo(tag)
  }
  if (!release) throw new Error(`Unable to create release ${tag}`)
  if (!release.isDraft) {
    if (release.isPrerelease) throw new Error(`${tag} is unexpectedly a prerelease`)
    assertRelease(release, assetNames, title)
    return
  }

  for (const stale of release.assets.filter((asset) => !assetNames.includes(asset.name))) {
    must(['gh', 'release', 'delete-asset', tag, stale.name, '--yes'])
  }
  must(['gh', 'release', 'upload', tag, ...assets, '--clobber'])
  release = releaseInfo(tag)
  if (!release) throw new Error(`Unable to read draft release ${tag}`)
  assertAssets(release, assetNames)

  const digests: Record<string, string> = {}
  for (const path of assets) {
    const name = basename(path)
    const remote = release.assets.find((asset) => asset.name === name)?.digest
    const local = `sha256:${await sha256(path)}`
    if (remote !== local) throw new Error(`Digest mismatch for ${name}`)
    digests[name] = remote
  }
  must(['gh', 'release', 'edit', tag, '--notes', attestationNotes(policy.notes, digests)])
}

async function promote(product: Product) {
  const policy = POLICIES[product]
  const version = await currentVersion(policy)
  const tag = `${policy.prefix}${version}`
  const title = policy.title(tag)
  const assetNames = policy.assets(version).sort()
  let release = releaseInfo(tag)
  if (!release) throw new Error(`Draft release ${tag} does not exist`)
  if (!release.isDraft) {
    if (release.isPrerelease) throw new Error(`${tag} is unexpectedly a prerelease`)
    assertRelease(release, assetNames, title)
    return
  }
  assertAssets(release, assetNames)
  assertAttestation(release, assetNames)
  must([
    'gh',
    'release',
    'edit',
    tag,
    '--title',
    title,
    '--notes',
    policy.notes,
    '--draft=false',
    '--prerelease=false'
  ])
  release = releaseInfo(tag)
  if (!release || release.isDraft || release.isPrerelease) {
    throw new Error(`${tag} was not published as a stable release`)
  }
  assertRelease(release, assetNames, title)
}

async function publish(product: Product, ref: string, assetDirectory: string) {
  await stage(product, ref, assetDirectory)
  await promote(product)
}

async function main() {
  const [action, productName, ...args] = Bun.argv.slice(2)
  const product = productFor(productName ?? '')
  if (action === 'prepare') {
    if (args.length !== 0) throw new Error('usage: release.ts prepare <product>')
    await prepare(product)
    return
  }
  if (action === 'publish') {
    const [ref, assetDirectory] = args
    if (!ref || !assetDirectory || args.length !== 2) {
      throw new Error('usage: release.ts publish <product> <ref> <asset-directory>')
    }
    await publish(product, ref, assetDirectory)
    return
  }
  if (action === 'stage') {
    const [ref, assetDirectory] = args
    if (!ref || !assetDirectory || args.length !== 2) {
      throw new Error('usage: release.ts stage <product> <ref> <asset-directory>')
    }
    await stage(product, ref, assetDirectory)
    return
  }
  if (action === 'promote') {
    if (args.length !== 0) throw new Error('usage: release.ts promote <product>')
    await promote(product)
    return
  }
  throw new Error('usage: release.ts <prepare|stage|promote|publish> <product> ...')
}

if (import.meta.main) await main()

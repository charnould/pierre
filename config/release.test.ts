import { afterEach, describe, expect, it } from 'bun:test'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { compareVersions, isExactSemver } from './release'

const RELEASE_SCRIPT = join(import.meta.dir, 'release.ts')
const tempDirs: string[] = []

const FAKE_GH = `#!/usr/bin/env bun
import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'

const statePath = process.env.GH_FAKE_STATE
const logPath = process.env.GH_FAKE_LOG
if (!statePath || !logPath) process.exit(2)
const state = JSON.parse(await Bun.file(statePath).text())
const args = Bun.argv.slice(2)
appendFileSync(logPath, args.join(' ') + '\\n')

if (args[0] !== 'release') process.exit(2)
if (args[1] === 'view') {
  if (!state.release) {
    console.error('release not found')
    process.exit(1)
  }
  console.log(JSON.stringify(state.release))
  process.exit(0)
}
if (args[1] === 'create') {
  const title = args[args.indexOf('--title') + 1]
  state.release = { assets: [], isDraft: true, isPrerelease: false, name: title }
}
if (args[1] === 'delete-asset') {
  const name = args[3]
  state.release.assets = state.release.assets.filter((asset) => asset.name !== name)
}
if (args[1] === 'upload') {
  const paths = args.slice(3, args.indexOf('--clobber'))
  for (const path of paths) {
    const name = basename(path)
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(await Bun.file(path).arrayBuffer())
    const digest = 'sha256:' + hasher.digest('hex')
    state.release.assets = state.release.assets.filter((asset) => asset.name !== name)
    state.release.assets.push({ name, digest })
  }
}
if (args[1] === 'edit') {
  state.release.isDraft = false
  state.release.isPrerelease = false
  state.release.name = args[args.indexOf('--title') + 1]
}
await Bun.write(statePath, JSON.stringify(state))
`

type Repository = {
  bin: string
  head: string
  log: string
  output: string
  root: string
  state: string
}

async function run(args: string[], cwd: string, env: Record<string, string> = {}) {
  const process = Bun.spawn(args, {
    cwd,
    env: { ...Bun.env, ...env },
    stderr: 'pipe',
    stdout: 'pipe'
  })
  const [exitCode, stderr, stdout] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
    new Response(process.stdout).text()
  ])
  return { exitCode, stderr, stdout }
}

async function must(args: string[], cwd: string) {
  const result = await run(args, cwd)
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

async function writeServerVersion(root: string, version: string) {
  await mkdir(join(root, 'server'), { recursive: true })
  await writeFile(
    join(root, 'server/package.json'),
    `${JSON.stringify({ name: '@pierre/server', version }, null, 2)}\n`
  )
}

async function repository(previous = '1.0.0', current = '1.1.0'): Promise<Repository> {
  const root = await mkdtemp(join(tmpdir(), 'pierre-release-'))
  tempDirs.push(root)
  await must(['git', 'init'], root)
  await must(['git', 'config', 'user.name', 'Release Test'], root)
  await must(['git', 'config', 'user.email', 'release@example.test'], root)
  await writeServerVersion(root, previous)
  await must(['git', 'add', '.'], root)
  await must(['git', 'commit', '-m', `server ${previous}`], root)
  await writeServerVersion(root, current)
  await must(['git', 'add', '.'], root)
  await must(['git', 'commit', '-m', `server ${current}`], root)

  const bin = join(root, 'bin')
  const state = join(root, 'gh-state.json')
  const log = join(root, 'gh.log')
  const output = join(root, 'output')
  await mkdir(bin)
  await writeFile(join(bin, 'gh'), FAKE_GH)
  await chmod(join(bin, 'gh'), 0o755)
  await writeFile(state, JSON.stringify({ release: null }))
  await writeFile(log, '')
  return {
    bin,
    head: await must(['git', 'rev-parse', 'HEAD'], root),
    log,
    output,
    root,
    state
  }
}

function releaseEnv(repo: Repository) {
  return {
    GH_FAKE_LOG: repo.log,
    GH_FAKE_STATE: repo.state,
    GITHUB_OUTPUT: repo.output,
    PATH: `${repo.bin}:${Bun.env.PATH}`
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('release version policy', () => {
  it('accepts exact stable semantic versions only', () => {
    expect(isExactSemver('0.40.7')).toBe(true)
    expect(isExactSemver('desktop-0.40.7')).toBe(false)
    expect(isExactSemver('0.40')).toBe(false)
    expect(isExactSemver('0.40.07')).toBe(false)
    expect(isExactSemver('0.40.7-beta.1')).toBe(false)
  })

  it('orders semantic versions numerically', () => {
    expect(compareVersions('0.40.7', '0.40.6')).toBe(1)
    expect(compareVersions('0.41.0', '0.40.99')).toBe(1)
    expect(compareVersions('0.40.6', '0.40.6')).toBe(0)
    expect(compareVersions('0.40.5', '0.40.6')).toBe(-1)
  })
})

describe('release reconciliation', () => {
  it('anchors an absent release to the version-bump commit', async () => {
    const repo = await repository()
    const result = await run(
      ['bun', RELEASE_SCRIPT, 'prepare', 'server'],
      repo.root,
      releaseEnv(repo)
    )
    expect(result.exitCode).toBe(0)
    expect(await readFile(repo.output, 'utf8')).toContain('publish=true\n')
    expect(await readFile(repo.output, 'utf8')).toContain(`ref=${repo.head}\n`)
    expect(await readFile(repo.output, 'utf8')).toContain('previous=0.0.0\n')
  })

  it('treats an exact stable release as complete', async () => {
    const repo = await repository()
    await must(['git', 'tag', 'server-1.1.0'], repo.root)
    await writeFile(
      repo.state,
      JSON.stringify({
        release: {
          assets: [{ name: 'libonnxruntime.so.1' }, { name: 'pierre' }],
          isDraft: false,
          isPrerelease: false,
          name: 'server-1.1.0'
        }
      })
    )
    const result = await run(
      ['bun', RELEASE_SCRIPT, 'prepare', 'server'],
      repo.root,
      releaseEnv(repo)
    )
    expect(result.exitCode).toBe(0)
    expect(await readFile(repo.output, 'utf8')).toContain('publish=false\n')
  })

  it('rejects a tag whose source has another version', async () => {
    const repo = await repository()
    const first = await must(['git', 'rev-list', '--max-parents=0', 'HEAD'], repo.root)
    await must(['git', 'tag', 'server-1.1.0', first], repo.root)
    const result = await run(
      ['bun', RELEASE_SCRIPT, 'prepare', 'server'],
      repo.root,
      releaseEnv(repo)
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('does not contain server/package.json version 1.1.0')
  })

  it('rejects an untagged downgrade', async () => {
    const repo = await repository('1.0.0', '0.9.0')
    const result = await run(
      ['bun', RELEASE_SCRIPT, 'prepare', 'server'],
      repo.root,
      releaseEnv(repo)
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('0.9.0 must be greater than 1.0.0')
  })

  it('removes stale draft assets before publishing the complete contract', async () => {
    const repo = await repository()
    await must(['git', 'tag', 'server-1.1.0'], repo.root)
    await writeFile(
      repo.state,
      JSON.stringify({
        release: {
          assets: [{ name: 'stale.txt' }],
          isDraft: true,
          isPrerelease: false,
          name: 'wrong title'
        }
      })
    )
    const assets = join(repo.root, 'assets')
    await mkdir(assets)
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'library')
    await writeFile(join(assets, 'pierre'), 'binary')

    const result = await run(
      ['bun', RELEASE_SCRIPT, 'publish', 'server', repo.head, assets],
      repo.root,
      releaseEnv(repo)
    )
    expect(result.exitCode).toBe(0)
    const state = JSON.parse(await readFile(repo.state, 'utf8'))
    expect(state.release.isDraft).toBe(false)
    expect(state.release.name).toBe('server-1.1.0')
    expect(state.release.assets.map((asset) => asset.name).sort()).toEqual([
      'libonnxruntime.so.1',
      'pierre'
    ])
    expect(await readFile(repo.log, 'utf8')).toContain(
      'release delete-asset server-1.1.0 stale.txt --yes'
    )
  })
})

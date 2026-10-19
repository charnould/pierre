import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cleanHost, mergeConfiguration, parseHostArgs, type EnvMap } from '../src/lib/config.ts'
import { acquireFileLock } from '../src/lib/file-lock.ts'
import {
  fetchReleases,
  selectCarlRelease,
  selectCliRelease,
  selectServerRelease,
  versionGreater,
  type Release
} from '../src/lib/github.ts'
import { renderStatus } from '../src/lib/output.ts'
import { createRuntime, runCommand } from '../src/lib/system.ts'
import { run } from '../src/main.ts'
import { CLI_VERSION } from '../src/version.ts'
import { tempRoot, testContext } from './support.ts'

const release = (tag: string, extra: Partial<Release> = {}): Release => ({
  tag,
  draft: false,
  prerelease: false,
  assets: [],
  ...extra
})

describe('commandes et droits', () => {
  it('lists the commands', async () => {
    const root = await tempRoot('pierre-help-')
    const ctx = testContext(root)
    const verbs = ['install', 'update', 'restart', 'backup', 'logs', 'env', 'remove']
    expect(await run([], ctx.ctx)).toBe(0)
    expect(
      ctx
        .out()
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((verb) => verbs.includes(verb ?? ''))
    ).toEqual(verbs)
    expect(ctx.out()).toContain('Installe les services')
    expect(ctx.out()).not.toContain('configure')
    expect(ctx.out()).not.toContain('Installer :')
  })

  it('rejects an unknown command', async () => {
    const root = await tempRoot('pierre-help-')
    const ctx = testContext(root)
    expect(await run(['help'], ctx.ctx)).toBe(2)
    expect(await run(['configure'], ctx.ctx)).toBe(2)
    expect(ctx.err()).toContain('Commande inconnue.')
    expect(ctx.out()).toBe('')
  })

  it('prints only the cli release tag without root', async () => {
    const root = await tempRoot('pierre-version-')
    const ctx = testContext(root, { uid: () => 1000 })
    expect(await run(['--version'], ctx.ctx)).toBe(0)
    expect(ctx.out()).toBe(`${CLI_VERSION}\n`)
  })

  it('keeps the installer tag injectable at release time', async () => {
    const script = await Bun.file(join(import.meta.dir, '../scripts/install.sh')).text()
    expect(script).toContain('\nTAG=__CLI_TAG__\n')
  })

  it('requires root for maintenance and a KVM machine only for install', async () => {
    const root = await tempRoot('pierre-root-')
    const user = testContext(root, { uid: () => 1000 })
    await expect(run(['env'], user.ctx)).rejects.toThrow('Il faut être root.')
    await expect(run(['install'], user.ctx)).rejects.toThrow('Il faut être root.')
    const arm = testContext(root, { arch: () => 'arm64' })
    await expect(run(['install'], arm.ctx)).rejects.toThrow('x86_64')
    const noKvm = testContext(root, { kvm: () => false })
    await expect(run(['install'], noKvm.ctx)).rejects.toThrow('/dev/kvm')
  })

  it('serializes removal with other lifecycle commands', async () => {
    const root = await tempRoot('pierre-lock-remove-')
    const ctx = testContext(root, { canPrompt: true, readLine: async () => 'oui' })
    await Bun.write(ctx.ctx.runtime.paths.envFile, 'HOST=example.org\n')
    const release = acquireFileLock(ctx.ctx.runtime.paths.lockFile)
    expect(release).toBeFunction()
    try {
      expect(await run(['remove'], ctx.ctx)).toBe(1)
      expect(await Bun.file(ctx.ctx.runtime.paths.envFile).exists()).toBe(true)
    } finally {
      release?.()
    }
  })
})

describe('processus', () => {
  it('drains stdout and stderr concurrently', async () => {
    const runtime = createRuntime()
    const result = await runCommand(runtime, process.execPath, [
      '-e',
      "await Bun.write(Bun.stderr, 'e'.repeat(256 * 1024)); await Bun.write(Bun.stdout, 'ok')"
    ])

    expect(result.code).toBe(0)
    expect(result.stdout).toBe('ok')
    expect(result.stderr).toHaveLength(256 * 1024)
  })
})

describe('présentation', () => {
  it('keeps the status readable and colorless outside a terminal', async () => {
    const root = await tempRoot('pierre-status-')
    const ctx = testContext(root)
    const text = renderStatus(ctx.ctx, [
      { level: 'ok', label: 'Installation', value: 'complète' },
      {
        level: 'bad',
        label: 'Configuration',
        value: 'absente',
        hint: 'Installer : pierre install --host DOMAINE'
      },
      { level: 'warn', label: 'RCS', value: 'non paramétré' }
    ])
    expect(text).toContain('██████')
    expect(text).toContain('\n\n\n')
    expect(text).toContain('install')
    expect(text).toContain('update')
    expect(text).toContain('Installe les services')
    expect(text).not.toContain('Documentation')
    expect(text).not.toContain('pierre-ia.org')
    expect(text).not.toContain('\u001b[')
    const updates = renderStatus(ctx.ctx, [
      { level: 'ok', label: 'carl', value: 'carl-1.0.0', next: 'carl-1.0.1' }
    ])
    expect(updates).not.toContain('┌')
    expect(updates).toContain('carl-1.0.0')
    expect(updates).toContain('→ carl-1.0.1')
    expect(updates).not.toContain('\u001b[7m')
    ctx.ctx.runtime.columns = 48
    const narrow = renderStatus(ctx.ctx, [
      {
        level: 'ok',
        label: 'LLM',
        value: 'Anthropic · https://api.anthropic.com/very/long'
      }
    ])
    expect(narrow).toContain('PIERRE')
    expect(narrow).not.toContain('◆')
    expect(narrow).toContain('…')
    expect(narrow).not.toContain('Documentation')
  })

  it('colors a terminal and honors NO_COLOR', async () => {
    const root = await tempRoot('pierre-color-')
    const colored = testContext(root, { tty: true, env: { NO_COLOR: '' } })
    const coloredStatus = renderStatus(colored.ctx, [
      { level: 'ok', label: 'server', value: 'server-0.40.7', next: 'server-0.40.9' }
    ])
    expect(coloredStatus).toContain('\u001b[')
    expect(coloredStatus).toContain('server-0.40.7\u001b[2m → \u001b[0m\u001b[33mserver-0.40.9')
    expect(coloredStatus).not.toContain('\u001b[2mserver-0.40.7')
    expect(coloredStatus).not.toContain('\u001b[7m')
    const plain = testContext(root, { tty: true, env: { NO_COLOR: '1' } })
    expect(
      renderStatus(plain.ctx, [{ level: 'ok', label: 'Site', value: 'https://exemple.org' }])
    ).not.toContain('\u001b[')
  })
})

describe('versions indépendantes', () => {
  const releases = [
    release('0.41.0'),
    release('server-0.40.6'),
    release('server-0.41.0'),
    release('0.42.0-rc.1', { prerelease: true }),
    release('carl-1.2.0'),
    release('carl-1.10.0'),
    release('carl-2.0.0'),
    release('cli-0.9.0'),
    release('cli-0.9.1'),
    release('cli-2.0.0', { prerelease: true }),
    release('SERVER-9.9.9'),
    release('CLI-9.9.9'),
    release('CARL-9.9.9'),
    release('9.9.9', { draft: true })
  ]

  it('keeps the highest lowercase server, carl and cli release', () => {
    expect(selectServerRelease(releases)?.tag).toBe('server-0.41.0')
    expect(selectCarlRelease(releases)?.tag).toBe('carl-2.0.0')
    expect(selectCliRelease(releases)?.tag).toBe('cli-0.9.1')
    expect(versionGreater('cli-0.9.2', 'cli-0.9.1')).toBe(true)
    expect(() => versionGreater('cli-0.9.2', 'CLI-0.9.1')).toThrow('Version illisible.')
  })

  it('rejects an incomplete GitHub catalog', async () => {
    const root = await tempRoot('pierre-catalog-')
    const failed = testContext(root, {
      request: async () => ({ status: 500, body: '', url: '' })
    })
    await expect(fetchReleases(failed.ctx)).rejects.toThrow(
      'Impossible de lire les releases GitHub.'
    )
    const empty = testContext(root, {
      request: async () => ({ status: 200, body: '[]', url: '' })
    })
    expect(await fetchReleases(empty.ctx)).toEqual([])
    const broken = testContext(root, {
      request: async () => ({ status: 200, body: 'ok', url: '' })
    })
    await expect(fetchReleases(broken.ctx)).rejects.toThrow('illisibles')
  })
})

describe('paramétrage', () => {
  it('cleans the host and keeps only known values', () => {
    expect(cleanHost('https://gx.pierre-ia.org/admin')).toBe('gx.pierre-ia.org')
  })

  it('requires the host and rejects anything else', () => {
    expect(parseHostArgs(['--provider', 'openai']).ok).toBe(false)
    expect(parseHostArgs(['--host=example.org']).ok).toBe(false)
    const merged = mergeConfiguration({}, { host: 'https://example.org/admin' })
    expect(merged.ok).toBe(true)
    if (!merged.ok) return
    expect(merged.env.host).toBe('example.org')
    expect(merged.env.password).toMatch(/^[a-kmnp-z2-9]{4}(?:-[a-kmnp-z2-9]{4}){3}$/)
  })

  it('keeps the password when only the host changes', () => {
    const current: EnvMap = {
      HOST: 'example.org',
      AUTH_PASSWORD: 'password-1234',
      AUTH_SECRET: 'ab'.repeat(32),
      AUTH_BEARER: 'bearer'
    }
    const next = mergeConfiguration(current, { host: 'autre.exemple.org' })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.env.password).toBe('password-1234')
  })
})

describe('sources', () => {
  it('does not reference the desktop tree or open SQLite itself', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-source-'))
    try {
      const files = ['../src', '../scripts/install.sh']
      for (const file of files) {
        const text = file.endsWith('.sh') ? await Bun.file(join(import.meta.dir, file)).text() : ''
        if (text) {
          expect(text.toLowerCase()).not.toContain('desktop')
          expect(text).not.toContain('sqlite3')
        }
      }
      const glob = new Bun.Glob('**/*.ts')
      for await (const file of glob.scan({ cwd: join(import.meta.dir, '../src') })) {
        const text = await Bun.file(join(import.meta.dir, '../src', file)).text()
        expect(text.toLowerCase()).not.toContain('desktop')
        expect(text).not.toContain('better-sqlite')
        expect(text).not.toContain('sqlite3')
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

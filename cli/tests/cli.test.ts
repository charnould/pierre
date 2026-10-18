import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  cleanHost,
  mergeConfiguration,
  parseConfigureArgs,
  type EnvMap
} from '../src/lib/config.ts'
import {
  CARL_TAG,
  latestMatching,
  selectCarlRelease,
  selectCliRelease,
  selectServerRelease,
  versionGreater,
  type Release
} from '../src/lib/github.ts'
import { renderHelp, renderStatus } from '../src/lib/output.ts'
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
    const ctx = testContext(root, { uid: () => 1000 })
    expect(await run(['help'], ctx.ctx)).toBe(0)
    expect(
      ctx
        .out()
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((verb) => verb && verb !== 'PIERRE')
    ).toEqual([
      'install',
      'configure',
      'update',
      'restart',
      'backup',
      'logs',
      'env',
      'remove',
      'help'
    ])
    expect(renderHelp(ctx.ctx)).toBe(ctx.out())
  })

  it('rejects an unknown command after printing help', async () => {
    const root = await tempRoot('pierre-help-')
    const ctx = testContext(root)
    expect(await run(['update-cli'], ctx.ctx)).toBe(2)
    expect(await run(['carl'], ctx.ctx)).toBe(2)
    expect(ctx.out()).toContain('configure')
    expect(ctx.out()).not.toContain('update-cli')
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
    expect(await run(['help'], user.ctx)).toBe(0)
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
        hint: 'Configurer : pierre configure'
      },
      { level: 'warn', label: 'RCS', value: 'non paramétré' }
    ])
    expect(text).toContain('██████')
    expect(text).toContain('\n\n\n')
    expect(text).toContain('install')
    expect(text).toContain('update')
    expect(text).toContain('Installe PIERRE sans le configurer')
    expect(text).not.toContain('Documentation')
    expect(text).not.toContain('pierre-ia.org')
    expect(text).not.toContain('\u001b[')
    const updates = renderStatus(ctx.ctx, [
      { level: 'ok', label: 'carl', value: 'carl-1.0.0', next: 'carl-1.0.1' }
    ])
    expect(updates).not.toContain('┌')
    expect(updates).toContain('carl-1.0.0')
    expect(updates).toContain('→ carl-1.0.1')
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
    expect(
      renderStatus(colored.ctx, [{ level: 'ok', label: 'Site', value: 'https://exemple.org' }])
    ).toContain('\u001b[')
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
    expect(
      latestMatching(
        releases.map((item) => item.tag),
        CARL_TAG
      )
    ).toBe('carl-2.0.0')
    expect(versionGreater('cli-0.9.2', 'CLI-0.9.1')).toBe(false)
  })
})

describe('paramétrage', () => {
  it('cleans the host and keeps only known values', () => {
    expect(cleanHost('https://gx.pierre-ia.org/admin')).toBe('gx.pierre-ia.org')
  })

  it('requires the host and rejects anything else', () => {
    expect(parseConfigureArgs(['--provider', 'openai']).ok).toBe(false)
    expect(parseConfigureArgs(['--host=example.org']).ok).toBe(false)
    const merged = mergeConfiguration({}, { host: 'https://example.org/admin' }, true)
    expect(merged.ok).toBe(true)
    if (!merged.ok) return
    expect(merged.env.host).toBe('example.org')
    expect(merged.passwordGenerated).toBe(true)
  })

  it('keeps the password when only the host changes', () => {
    const current: EnvMap = {
      HOST: 'example.org',
      AUTH_PASSWORD: 'password-1234',
      AUTH_SECRET: 'ab'.repeat(32),
      AUTH_BEARER: 'bearer'
    }
    const next = mergeConfiguration(current, { host: 'autre.exemple.org' }, false)
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.env.password).toBe('password-1234')
    expect(next.passwordGenerated).toBe(false)
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

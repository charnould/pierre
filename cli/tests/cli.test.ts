import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cleanHost, parseDotenv, readEnvMap, validCmToken } from '../src/lib/config.ts'
import {
  CARL_TAG,
  latestMatching,
  selectCarlRelease,
  selectCliRelease,
  selectServerRelease,
  versionGreater,
  type Release
} from '../src/lib/github.ts'
import {
  cliUpdateAvailable,
  renderDashboard,
  renderHelp,
  renderLogo,
  renderMenu,
  serverUpdateAvailable
} from '../src/lib/output.ts'
import { decodeKey } from '../src/lib/system.ts'
import { MAIN_MENU, menuAction, moveSelection } from '../src/lib/tui.ts'
import { run } from '../src/main.ts'
import { CLI_VERSION } from '../src/version.ts'
import { block, tempRoot, testContext } from './support.ts'

const release = (tag: string, extra: Partial<Release> = {}): Release => ({
  tag,
  draft: false,
  prerelease: false,
  assets: [],
  ...extra
})

describe('commandes et droits', () => {
  it('lists the commands, including the separate cli update', async () => {
    const root = await tempRoot('pierre-help-')
    const ctx = testContext(root, { uid: () => 1000 })
    expect(await run(['help'], ctx.ctx)).toBe(0)
    expect(
      ctx
        .out()
        .trim()
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
    ).toEqual([
      'install',
      'update',
      'update-cli',
      'carl',
      'restart',
      'backup',
      'logs',
      'configure',
      'env',
      'remove',
      'help'
    ])
    expect(renderHelp(ctx.ctx)).toBe(ctx.out())
  })

  it('rejects an unknown command after printing help', async () => {
    const root = await tempRoot('pierre-help-')
    const ctx = testContext(root)
    expect(await run(['nope'], ctx.ctx)).toBe(1)
    expect(ctx.out()).toContain('update-cli')
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

describe('terminal', () => {
  it('decodes arrows, enter, escape and quit', () => {
    expect(decodeKey('\u001b[A')).toBe('up')
    expect(decodeKey('\u001b[B')).toBe('down')
    expect(decodeKey('\u001b[D')).toBe('back')
    expect(decodeKey('\u001b')).toBe('back')
    expect(decodeKey('')).toBe('enter')
    expect(decodeKey('q')).toBe('quit')
  })

  it('wraps the selection and keeps labels aligned with actions', () => {
    expect(moveSelection(0, MAIN_MENU.length, 'up')).toBe(MAIN_MENU.length - 1)
    expect(moveSelection(MAIN_MENU.length - 1, MAIN_MENU.length, 'down')).toBe(0)
    expect(menuAction(0)).toBe('logs')
    expect(MAIN_MENU.map((item) => item.action)).toEqual([
      'logs',
      'backup',
      'restart',
      'update',
      'update-cli',
      'carl',
      'configure',
      'remove',
      'quit'
    ])
    expect(MAIN_MENU.map((item) => item.label)).toEqual([
      'Consulter les journaux',
      'Sauvegarder les données',
      'Redémarrer PIERRE (serveur)',
      'Mettre à jour PIERRE (serveur)',
      'Mettre à jour le cli',
      'Mettre à jour carl (classification)',
      'Configurer PIERRE (serveur)',
      'Tout désinstaller',
      'Quitter'
    ])
  })

  it('prints the wordmark and the two-line signature', async () => {
    const root = await tempRoot('pierre-logo-')
    const ctx = testContext(root)
    const logo = renderLogo(ctx.ctx)
    expect(logo).toContain('██████╗ ██╗███████╗')
    expect(logo).toContain(
      '  Application agentique et open source\n  au service du mouvement HLM\n'
    )
    expect(logo).not.toContain('\u001b[')
    ctx.ctx.runtime.columns = 40
    expect(renderLogo(ctx.ctx)).toContain('◆  PIERRE')
    expect(renderLogo(ctx.ctx)).not.toContain('██████╗ ██╗███████╗')
  })

  it('aligns the status columns and keeps uninstall in the default color', async () => {
    const root = await tempRoot('pierre-dash-')
    const ctx = testContext(root)
    const dash = {
      networkOk: true,
      networkStatus: 'opérationnel',
      networkDetail: 'gx.pierre-ia.org',
      pierreOk: true,
      pierreStatus: 'opérationnel',
      serverVersion: 'server-0.40.6',
      serverLatest: 'server-0.40.6',
      cliOk: true,
      cliStatus: 'opérationnel',
      cliVersion: 'cli-0.9.1',
      cliLatest: 'cli-0.9.1',
      carlOk: true,
      carlStatus: 'opérationnel',
      carlVersion: 'carl-1.0.0',
      carlLatest: 'carl-1.0.0',
      providerOk: true,
      providerStatus: 'connecté',
      providerDetail: 'Anthropic'
    }
    const rendered = renderDashboard(ctx.ctx, dash)
    const line = (label: string) =>
      rendered.split('\n').find((entry) => entry.includes(label)) ?? ''
    expect(line('réseau').indexOf('opérationnel')).toBe(21)
    expect(line('serveur').indexOf('server-0.40.6')).toBe(21)
    expect(line('cli').indexOf('cli-0.9.1')).toBe(21)
    expect(line('carl').indexOf('carl-1.0.0')).toBe(21)
    expect(line('llm').indexOf('Anthropic')).toBe(21)
    expect([
      line('réseau').indexOf('gx.pierre-ia.org'),
      line('serveur').indexOf('opérationnel (à jour)'),
      line('cli').indexOf('opérationnel (à jour)'),
      line('carl').indexOf('opérationnel (à jour)'),
      line('llm').indexOf('connecté')
    ]).toEqual([40, 40, 40, 40, 40])
    const updateDash = { ...dash, serverLatest: 'server-0.41.0' }
    const fullStatus = renderDashboard(ctx.ctx, updateDash)
    expect(fullStatus).toContain('Mise à jour disponible · server-0.40.6 → server-0.41.0')
    expect(fullStatus).toContain('Le cli reste inchangé.')

    const colored = testContext(await tempRoot('pierre-dash-color-'), {
      env: { NO_COLOR: undefined },
      tty: true
    })
    const cliUpdateDash = { ...dash, cliLatest: 'cli-0.9.2' }
    const cliStatus = renderDashboard(colored.ctx, cliUpdateDash)
    const cliLine = cliStatus.split('\n').find((entry) => entry.includes('cli-0.9.1')) ?? ''
    const { reset, yellow } = colored.ctx.runtime.palette
    expect(cliLine).toContain(`opérationnel ${yellow}(cli-0.9.2 disponible)${reset}`)
    expect(cliLine).not.toContain(`${yellow}opérationnel`)
    expect(cliStatus).not.toContain('Mise à jour du cli disponible')
    expect(cliStatus).not.toContain('Seul le programme pierre sera remplacé.')
    expect(cliUpdateAvailable(cliUpdateDash)).toBe(true)

    const menu = renderMenu(
      ctx.ctx,
      updateDash,
      0,
      MAIN_MENU.map((item) =>
        item.action === 'update' ? 'Mettre à jour PIERRE vers server-0.41.0' : item.label
      )
    )
    expect(menu).toContain('· ↑ server-0.41.0')
    expect(menu).toContain('██████╗')
    expect(menu).toContain('Application agentique et open source')
    expect(menu).toContain('au service du mouvement HLM')
    expect(menu).not.toContain('https://')
    expect(menu).toContain('Tout désinstaller')
    expect(menu.trimEnd().split('\n').length).toBeLessThanOrEqual(31)
    const menuLine = (label: string) =>
      menu.split('\n').find((entry) => entry.includes(label)) ?? ''
    expect([
      menuLine('réseau').indexOf('gx.pierre-ia.org'),
      menuLine('serveur').indexOf('server-0.40.6'),
      menuLine('cli').indexOf('cli-0.9.1'),
      menuLine('carl').indexOf('carl-1.0.0'),
      menuLine('llm').indexOf('Anthropic')
    ]).toEqual([14, 14, 14, 14, 14])
    expect([
      menuLine('réseau').indexOf('·'),
      menuLine('serveur').indexOf('·'),
      menuLine('cli').indexOf('·'),
      menuLine('carl').indexOf('·'),
      menuLine('llm').indexOf('·')
    ]).toEqual([35, 35, 35, 35, 35])

    const narrow = testContext(await tempRoot('pierre-dash-narrow-'), { columns: 40 })
    const narrowMenu = renderMenu(
      narrow.ctx,
      updateDash,
      0,
      MAIN_MENU.map((item) => item.label)
    )
    expect(
      narrowMenu
        .trimEnd()
        .split('\n')
        .every((entry) => [...entry].length <= 40)
    ).toBe(true)
    expect(serverUpdateAvailable({ ...dash, serverLatest: '' })).toBe(false)
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

describe('dotenv', () => {
  it('cleans the host and reads the last value', async () => {
    expect(cleanHost('https://gx.pierre-ia.org/admin')).toBe('gx.pierre-ia.org')
    const root = await tempRoot('pierre-env-')
    await writeFile(join(root, 'pierre.env'), 'HOST=one\nOTHER=no\nHOST=two\n')
    expect(readEnvMap(join(root, 'pierre.env'))['HOST']).toBe('two')
    expect(readEnvMap(join(root, 'absent.env'))['HOST']).toBeUndefined()
  })

  it('accepts a complete install block and generates AUTO secrets without executing values', () => {
    const marker = '$(touch /tmp/pierre-should-not-exist)'
    const parsed = parseDotenv(
      block({ AI_API_KEY: `sk=value=${marker}` }),
      'install',
      {},
      (bytes) => 'ab'.repeat(bytes)
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.env.host).toBe('example.org')
    expect(parsed.env.authSecret).toHaveLength(64)
    expect(parsed.env.authBearer).toHaveLength(32)
    expect(parsed.env.cmMode).toBe('later')
    expect(parsed.env.aiApiKey).toBe(`sk=value=${marker}`)
  })

  it('rejects missing, unknown, duplicate and partial CM values', () => {
    expect(parseDotenv(block().replace('CM_FROM=\n', ''), 'install', {}, () => 'x').ok).toBe(false)
    const unknown = parseDotenv(`${block()}UNKNOWN=value\n`, 'install', {}, () => 'x')
    const duplicate = parseDotenv(`${block()}HOST=other\n`, 'install', {}, () => 'x')
    expect(unknown.ok).toBe(false)
    expect(duplicate.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error).toContain('UNKNOWN')
    if (!duplicate.ok) expect(duplicate.error).toContain('dupliquée')
    const partial = parseDotenv(
      block({ CM_PRODUCT_TOKEN: '00000000-0000-0000-0000-000000000000' }),
      'install',
      {},
      (bytes) => 'ab'.repeat(bytes)
    )
    expect(partial.ok).toBe(false)
    if (!partial.ok) expect(partial.error).toContain('CM_FROM')
    expect(validCmToken('00000000-0000-0000-0000-000000000000')).toBe(true)
    expect(validCmToken('account-id')).toBe(false)
  })

  it('keeps bootstrap secrets unchanged during configuration', () => {
    const current = {
      HOST: 'example.org',
      AUTH_PASSWORD: 'password1',
      AUTH_SECRET: 's'.repeat(32),
      AUTH_BEARER: 'current-bearer'
    }
    const changed = parseDotenv(
      block({ AUTH_SECRET: 'x'.repeat(32), AUTH_BEARER: 'current-bearer' }),
      'configure',
      current,
      () => 'x'
    )
    expect(changed.ok).toBe(false)
    if (!changed.ok) expect(changed.error).toContain('AUTH_SECRET doit rester inchangé')
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

import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { CARL_MODEL_FILES } from '../../shared/carl-model.ts'
import { installCliRelease } from '../src/commands/cli-release.ts'
import { printEnv } from '../src/commands/env.ts'
import { installCommand } from '../src/commands/install.ts'
import { logs } from '../src/commands/logs.ts'
import { restart } from '../src/commands/restart.ts'
import { collectStatus } from '../src/commands/status.ts'
import { updateServer } from '../src/commands/update-server.ts'
import { update } from '../src/commands/update.ts'
import {
  configuredText,
  recordChecksum,
  tempRoot,
  testContext,
  writeCarlZip,
  writeExe,
  writeServerBundle
} from './support.ts'

async function writeServerChecksums(directory: string) {
  for (const name of ['pierre', 'libonnxruntime.so.1', 'pierre-linux-amd64.smolmachine']) {
    await recordChecksum(directory, name)
  }
}

describe('environnement et santé', () => {
  it('prints the dotenv block in stable order, secrets included', async () => {
    const root = await tempRoot('pierre-env-')
    const file = join(root, 'pierre.env')
    await writeFile(
      file,
      [
        'CM_RCS_FROM=PIERRE',
        'AI_API_KEY=sk=value',
        'HOST=example.org',
        'AUTH_PASSWORD=password1',
        `AUTH_SECRET=${'s'.repeat(32)}`,
        'AUTH_BEARER=bearer',
        'AI_TYPE=anthropic',
        'AI_BASE_URL=https://api.anthropic.com',
        'CM_RCS_PRODUCT_TOKEN=00000000-0000-0000-0000-000000000000',
        'CM_RCS_WEBHOOK_SECRET=webhook',
        'CM_EMAIL_DOMAIN=',
        'CM_EMAIL_PRODUCT_TOKEN=',
        'CM_EMAIL_ACCOUNT_ID=',
        'CM_EMAIL_WEBHOOK_SECRET=',
        ''
      ].join('\n')
    )
    const ctx = testContext(root)
    expect(printEnv(ctx.ctx)).toBe(0)
    expect(ctx.out()).toBe(
      [
        'HOST=example.org',
        'AUTH_PASSWORD=password1',
        `AUTH_SECRET=${'s'.repeat(32)}`,
        'AUTH_BEARER=bearer',
        ''
      ].join('\n')
    )
    const missing = testContext(await tempRoot('pierre-env-missing-'))
    expect(printEnv(missing.ctx)).toBe(1)
    expect(missing.err()).toContain('PIERRE n’est pas configuré.')
  })

  it('requires the services and the public endpoint', async () => {
    const root = await tempRoot('pierre-health-')
    await writeFile(join(root, 'pierre.env'), configuredText({ HOST: 'gx.pierre-ia.org' }))
    await writeServerBundle(root, 'server-0.40.6')
    const healthy = testContext(root, {
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        if (url.includes('/api/models/carl')) return { status: 200, body: '{}', url }
        if (url.includes('api.anthropic.com')) return { status: 200, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    const lines = await collectStatus(healthy.ctx)
    expect(lines.find((line) => line.label === 'www')?.level).toBe('ok')
    expect(lines.find((line) => line.label === 'server')?.level).toBe('ok')
    expect(lines.find((line) => line.label === 'server')?.value).toBe('server-0.40.6')
    expect(lines.find((line) => line.label === 'carl')?.level).toBe('ok')
    expect(
      lines.some((line) => line.label === 'llm' || line.label === 'rcs' || line.label === 'email')
    ).toBe(false)
    expect(healthy.calls.some((call) => call.args.join(' ').includes('api.anthropic.com'))).toBe(
      false
    )
    const down = testContext(root, {
      start: (_command, args) => ({
        finished: Promise.resolve({
          code: 0,
          stdout: args.join(' ').includes('pierre') ? 'inactive\n' : 'active\n',
          stderr: ''
        }),
        kill: () => undefined
      }),
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        return { status: 200, body: 'ok', url }
      }
    })
    const failed = await collectStatus(down.ctx)
    expect(failed.find((line) => line.label === 'server')?.level).toBe('bad')
    expect(failed.find((line) => line.label === 'carl')?.level).toBe('bad')
    expect(failed.find((line) => line.label === 'www')?.level).toBe('ok')
  })
})

describe('installation atomique', () => {
  it('remembers the asset directory without touching an existing configuration', async () => {
    const root = await tempRoot('pierre-atomic-')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, {
      env: { PIERRE_ASSET_DIR: '/tmp/pierre-assets' },
      start: () => ({
        finished: Promise.resolve({ code: 1, stdout: '', stderr: 'apt failed\n' }),
        kill: () => undefined
      })
    })
    expect(await installCommand(ctx.ctx, ['--host', 'example.org'])).toBe(1)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
    expect(readFileSync(join(root, 'asset-source'), 'utf8')).toBe('/tmp/pierre-assets\n')
  })

  it('publishes the host and removes a failed first configuration', async () => {
    const root = await tempRoot('pierre-atomic-')
    await readyInstallation(root)
    const ctx = testContext(root, { commandExists: (name) => name === 'caddy' })
    expect(await installCommand(ctx.ctx, ['--host', 'example.org'])).toBe(0)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
    expect(readFileSync(join(root, 'Caddyfile'), 'utf8')).toContain('example.org')

    const failed = await tempRoot('pierre-atomic-fail-')
    await readyInstallation(failed)
    const broken = testContext(failed, {
      commandExists: (name) => name === 'caddy',
      start: (command, args) => {
        const name = command.split('/').pop()
        if (name === 'systemctl' && args[0] === 'daemon-reload') {
          return {
            finished: Promise.resolve({ code: 1, stdout: '', stderr: 'unit failed\n' }),
            kill: () => undefined
          }
        }
        if (name === 'smolvm' && args[0] === '--version') {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'smolvm 1.24.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        return {
          finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
          kill: () => undefined
        }
      }
    })
    expect(await installCommand(broken.ctx, ['--host', 'example.org'])).toBe(1)
    expect(existsSync(join(failed, 'pierre.env'))).toBe(false)
  })

  it('stops at the first failing step without publishing a configuration', async () => {
    const root = await tempRoot('pierre-steps-')
    await readyCaddy(root)
    let aptCaddy = false
    const ctx = testContext(root, {
      start: (command, args) => {
        const name = command.split('/').pop()
        if (name === 'smolvm' && args[0] === '--version') {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'smolvm 1.24.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        if (name === 'apt-get' && args.includes('caddy')) {
          aptCaddy = true
          return {
            finished: Promise.resolve({ code: 7, stdout: 'caddy failed clearly\n', stderr: '' }),
            kill: () => undefined
          }
        }
        return {
          finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
          kill: () => undefined
        }
      }
    })
    const code = await installCommand(ctx.ctx, ['--host', 'example.org'])
    expect(code).toBe(1)
    expect(aptCaddy).toBe(true)
    expect(ctx.out()).toContain('Caddy')
    expect(readFileSync(join(root, 'install.log'), 'utf8')).toContain('caddy failed clearly')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
  })

  it('installs the software and publishes the host', async () => {
    const root = await tempRoot('pierre-stdin-')
    const ctx = testContext(root, {
      request: async (url) => {
        if (url.includes('api.github.com')) {
          return {
            status: 200,
            body: JSON.stringify([
              {
                tag_name: 'server-0.41.0',
                draft: false,
                prerelease: false,
                assets: []
              },
              { tag_name: 'carl-1.2.0', draft: false, prerelease: false, assets: [] }
            ]),
            url
          }
        }
        return { status: 200, body: url.includes('api.anthropic.com') ? '' : 'ok', url }
      }
    })
    ctx.ctx.runtime.env['PIERRE_ASSET_DIR'] = root
    await writeExe(join(root, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(root, 'libonnxruntime.so.1'), 'library')
    await writeFile(join(root, 'pierre-linux-amd64.smolmachine'), 'image')
    await writeCarlZip(root)
    await writeServerChecksums(root)
    const code = await installCommand(ctx.ctx, ['--host', 'example.org'])
    expect(code).toBe(0)
    expect(ctx.out()).toContain('admin@pierre-ia.org')
    expect(ctx.out()).not.toContain('configure')
    expect(existsSync(join(root, 'pierre.env'))).toBe(true)
    expect(existsSync(join(root, 'pierre.service'))).toBe(true)
    const unit = readFileSync(join(root, 'pierre.service'), 'utf8')
    expect(unit).toContain(`Environment=HOME=${join(root, 'smolvm-home')}`)
    expect(unit).toContain(`Environment=XDG_DATA_HOME=${join(root, 'smolvm-home', '.local/share')}`)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
  })
})

async function readyCaddy(root: string) {
  await writeFile(join(root, 'caddy-key.gpg'), 'key')
  await writeFile(join(root, 'caddy-owned'), 'PIERRE\n')
  await writeFile(join(root, 'caddy-source.list'), 'source')
}

async function readyInstallation(root: string) {
  await writeServerBundle(root, 'server-0.40.6')
  await writeFile(join(root, 'pierre.service'), 'unit\n')
  await readyCaddy(root)
  const carl = join(root, 'home', 'models', 'carl')
  await mkdir(carl, { recursive: true })
  for (const name of CARL_MODEL_FILES) await writeFile(join(carl, name), name)
  await writeFile(join(carl, 'version'), 'carl-1.0.0\n')
}

describe('configuration', () => {
  const args = ['--host', 'example.org']

  it('rejects an incomplete command without writing a file', async () => {
    const root = await tempRoot('pierre-configure-invalid-')
    await writeServerBundle(root, 'server-0.40.6')
    const ctx = testContext(root)
    expect(await installCommand(ctx.ctx, [])).toBe(2)
    expect(await installCommand(ctx.ctx, ['--provider', 'openai'])).toBe(2)
    expect(ctx.out()).toContain('pierre install --host')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
  })

  it('refuses to take over an existing Caddy installation', async () => {
    const root = await tempRoot('pierre-caddy-owner-')
    const caddy = join(root, 'Caddyfile')
    await writeFile(caddy, 'existing.example.org {\n\trespond "existing"\n}\n')
    const ctx = testContext(root, { commandExists: (name) => name === 'caddy' })

    expect(await installCommand(ctx.ctx, args)).toBe(1)
    expect(ctx.err()).toContain('Caddy est déjà géré')
    expect(readFileSync(caddy, 'utf8')).toContain('existing.example.org')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
  })

  it('removes generated secrets when the public address does not answer', async () => {
    const root = await tempRoot('pierre-configure-rollback-')
    await readyInstallation(root)
    const ctx = testContext(root, {
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        if (url.includes('api.anthropic.com')) return { status: 200, body: '', url }
        if (url.startsWith('https://')) return { status: 0, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    expect(await installCommand(ctx.ctx, args)).toBe(1)
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(ctx.out()).not.toContain('admin@pierre-ia.org')
  })

  it('restores a working configuration when a new host does not answer', async () => {
    const root = await tempRoot('pierre-configure-restore-')
    await readyInstallation(root)
    const previousEnv = configuredText({ HOST: 'old.example.org' })
    const previousCaddy =
      '# Managed by PIERRE\nold.example.org {\n\treverse_proxy 127.0.0.1:3000\n}\n'
    await writeFile(join(root, 'pierre.env'), previousEnv)
    await writeFile(join(root, 'Caddyfile'), previousCaddy)
    const ctx = testContext(root, {
      commandExists: (name) => name === 'caddy',
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        if (url === 'https://new.example.org/up') return { status: 0, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })

    expect(await installCommand(ctx.ctx, ['--host', 'new.example.org'])).toBe(1)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toBe(previousEnv)
    expect(readFileSync(join(root, 'Caddyfile'), 'utf8')).toBe(previousCaddy)
  })

  it('restores Caddy even when restarting Pierre fails during rollback', async () => {
    const root = await tempRoot('pierre-configure-restore-')
    await readyInstallation(root)
    const previousEnv = configuredText({ HOST: 'old.example.org' })
    const previousCaddy =
      '# Managed by PIERRE\nold.example.org {\n\treverse_proxy 127.0.0.1:3000\n}\n'
    await writeFile(join(root, 'pierre.env'), previousEnv)
    await writeFile(join(root, 'Caddyfile'), previousCaddy)
    let pierreRestarts = 0
    let caddyReloads = 0
    const ctx = testContext(root, {
      commandExists: (name) => name === 'caddy',
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        if (url === 'https://new.example.org/up') return { status: 0, body: '', url }
        return { status: 200, body: 'ok', url }
      },
      start: (command, args) => {
        const name = command.split('/').pop()
        if (name === 'smolvm') {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'smolvm 1.24.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        if (name === 'systemctl' && args[0] === 'restart' && args[1] === 'pierre') {
          pierreRestarts += 1
          return {
            finished: Promise.resolve({
              code: pierreRestarts === 2 ? 1 : 0,
              stdout: '',
              stderr: ''
            }),
            kill: () => undefined
          }
        }
        if (name === 'systemctl' && args[0] === 'reload' && args[1] === 'caddy') {
          caddyReloads += 1
        }
        return {
          finished: Promise.resolve({ code: 0, stdout: 'active\n', stderr: '' }),
          kill: () => undefined
        }
      }
    })

    expect(await installCommand(ctx.ctx, ['--host', 'new.example.org'])).toBe(1)
    expect(pierreRestarts).toBe(2)
    expect(caddyReloads).toBe(2)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toBe(previousEnv)
    expect(readFileSync(join(root, 'Caddyfile'), 'utf8')).toBe(previousCaddy)
    expect(existsSync(join(root, 'Caddyfile.new'))).toBe(false)
  })

  it('publishes the configuration and shows the first password once', async () => {
    const root = await tempRoot('pierre-configure-ok-')
    await readyInstallation(root)
    const ctx = testContext(root)
    expect(await installCommand(ctx.ctx, args)).toBe(0)
    const env = readFileSync(join(root, 'pierre.env'), 'utf8')
    expect(env).toContain('HOST=example.org')
    expect(env).not.toContain('AI_')
    expect(env).not.toContain('CM_')
    expect(ctx.out()).toContain('admin@pierre-ia.org')
    const password = env.match(/^AUTH_PASSWORD=(.*)$/m)?.[1] ?? ''
    expect(password).toMatch(/^[a-kmnp-z2-9]{4}(?:-[a-kmnp-z2-9]{4}){3}$/)
    expect(ctx.out()).toContain(password)
    expect(ctx.out()).not.toContain('Notez-le')
    const again = testContext(root)
    expect(await installCommand(again.ctx, ['--host', 'autre.exemple.org'])).toBe(0)
    expect(again.out()).not.toContain(password)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain(`AUTH_PASSWORD=${password}`)
  })

  it('installs packages only while dpkg does not already have them', async () => {
    const root = await tempRoot('pierre-provisioned-')
    await readyInstallation(root)
    const seen: string[][] = []
    let present = false
    const ctx = testContext(root, {
      commandExists: (name) => name === 'caddy',
      start: (command, args) => {
        const name = command.split('/').pop() ?? command
        seen.push([name, ...args])
        if (name === 'dpkg-query') {
          if (!present) {
            return {
              finished: Promise.resolve({ code: 1, stdout: '', stderr: '' }),
              kill: () => undefined
            }
          }
          const stdout = args
            .filter((arg) => !arg.startsWith('-') && !arg.includes('$'))
            .map((pkg) => `${pkg} installed\n`)
            .join('')
          return {
            finished: Promise.resolve({ code: 0, stdout, stderr: '' }),
            kill: () => undefined
          }
        }
        if (name === 'apt-get' && args[0] === 'install') present = true
        if (name === 'smolvm') {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'smolvm 1.24.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        return {
          finished: Promise.resolve({ code: 0, stdout: 'active\n', stderr: '' }),
          kill: () => undefined
        }
      }
    })
    expect(await installCommand(ctx.ctx, args)).toBe(0)
    expect(seen.some((call) => call[0] === 'apt-get')).toBe(true)
    expect(existsSync(join(root, 'home', 'packages'))).toBe(false)
    seen.length = 0
    expect(await installCommand(ctx.ctx, ['--host', 'autre.exemple.org'])).toBe(0)
    expect(seen.some((call) => call[0] === 'apt-get')).toBe(false)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=autre.exemple.org')
    present = false
    seen.length = 0
    expect(await installCommand(ctx.ctx, ['--host', 'encore.exemple.org'])).toBe(0)
    expect(seen.some((call) => call[0] === 'apt-get')).toBe(true)
  })

  it('repairs an empty Caddy source on retry', async () => {
    const root = await tempRoot('pierre-caddy-retry-')
    await readyInstallation(root)
    const source = join(root, 'caddy-source.list')
    await writeFile(source, '')
    const downloads: string[] = []
    const ctx = testContext(root, {
      download: async (url, dest) => {
        downloads.push(url)
        await writeFile(
          dest,
          'deb https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main\n'
        )
      }
    })

    expect(await installCommand(ctx.ctx, args)).toBe(0)
    expect(downloads).toEqual(['https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt'])
    expect(readFileSync(source, 'utf8')).toContain('dl.cloudsmith.io')
    expect(ctx.calls.some((call) => call.command === 'apt-get' && call.args[0] === 'update')).toBe(
      true
    )
  })

  it('installs the server again when the bundle is incomplete', async () => {
    const root = await tempRoot('pierre-incomplete-server-')
    await readyInstallation(root)
    await unlink(
      join(root, 'home', 'server', 'releases', 'server-0.40.6', 'pierre-linux-amd64.smolmachine')
    )
    const ctx = testContext(root, { commandExists: (name) => name === 'caddy' })
    expect(await installCommand(ctx.ctx, ['--host', 'example.org'])).toBe(1)
    expect(ctx.out()).toContain('« Server »')
  })
})

async function writeInstalledCarl(root: string, tag: string) {
  const dir = join(root, 'home', 'models', 'carl')
  await mkdir(dir, { recursive: true })
  for (const name of CARL_MODEL_FILES) await writeFile(join(dir, name), name)
  await writeFile(join(dir, 'version'), `${tag}\n`)
}

function carlReleases(tag: string) {
  return async (url: string) => {
    if (url.includes('api.github.com')) {
      return {
        status: 200,
        body: JSON.stringify([
          {
            tag_name: tag,
            draft: false,
            prerelease: false,
            assets: [{ name: 'model.zip', digest: `sha256:${'ab'.repeat(32)}` }]
          }
        ]),
        url
      }
    }
    return { status: 200, body: 'ok', url }
  }
}

describe('mises à jour séparées', () => {
  it('does not download when the server is current and never touches the cli', async () => {
    const root = await tempRoot('pierre-update-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_SERVER_TAG: 'server-0.40.6' } })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(ctx.out()).toContain('server-0.40.6 est déjà à jour.')
    expect(readFileSync(join(root, 'pierre'), 'utf8')).toBe('old cli')
    expect(
      ctx.calls.some((call) => call.command === 'systemctl' && call.args[0] === 'restart')
    ).toBe(false)
  })

  it('leaves a current server and a current carl without restarting', async () => {
    const root = await tempRoot('pierre-carl-current-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeInstalledCarl(root, 'carl-1.0.0')
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.40.6' },
      request: carlReleases('carl-1.0.0')
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(ctx.out()).toContain('server-0.40.6 est déjà à jour.')
    expect(ctx.out()).not.toContain('Téléchargement de carl')
    expect(
      ctx.calls.some((call) => call.command === 'systemctl' && call.args[0] === 'restart')
    ).toBe(false)
  })

  it('installs a missing carl and restarts once when the server is current', async () => {
    const root = await tempRoot('pierre-carl-missing-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeCarlZip(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.40.6', PIERRE_ASSET_DIR: assets },
      request: carlReleases('carl-1.2.0')
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(readFileSync(join(root, 'home', 'models', 'carl', 'version'), 'utf8')).toBe(
      'carl-1.2.0\n'
    )
    expect(existsSync(join(root, 'home', 'models', 'carl', 'labels.json'))).toBe(true)
    const restarts = ctx.calls.filter(
      (call) => call.command === 'systemctl' && call.args[0] === 'restart'
    )
    expect(restarts).toHaveLength(1)
  })

  it('reinstalls carl when the version matches but a model file is missing', async () => {
    const root = await tempRoot('pierre-carl-partial-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeCarlZip(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const dir = join(root, 'home', 'models', 'carl')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'model.onnx'), 'model')
    await writeFile(join(dir, 'version'), 'carl-1.0.0\n')
    await writeFile(join(dir, 'stale.bin'), 'old')
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.40.6', PIERRE_ASSET_DIR: assets },
      request: carlReleases('carl-1.0.0')
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(existsSync(join(dir, 'tokenizer.json'))).toBe(true)
    expect(existsSync(join(dir, 'stale.bin'))).toBe(false)
    expect(
      ctx.calls.filter((call) => call.command === 'systemctl' && call.args[0] === 'restart')
    ).toHaveLength(1)
  })

  it('installs carl before the single server restart', async () => {
    const root = await tempRoot('pierre-carl-server-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeCarlZip(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(join(assets, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(assets, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    await writeServerChecksums(assets)
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets },
      request: carlReleases('carl-1.2.0')
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(readFileSync(join(root, 'home', 'models', 'carl', 'model.onnx'), 'utf8')).toBe(
      'model.onnx'
    )
    const stop = ctx.calls.findIndex(
      (call) => call.command === 'systemctl' && call.args[0] === 'stop'
    )
    const start = ctx.calls.findIndex(
      (call) => call.command === 'systemctl' && call.args[0] === 'start'
    )
    expect(stop).toBeGreaterThanOrEqual(0)
    expect(start).toBeGreaterThan(stop)
    expect(
      ctx.calls.filter((call) => call.command === 'systemctl' && call.args[0] === 'restart')
    ).toHaveLength(0)
    const unzip = ctx.calls.findIndex((call) => call.command.endsWith('unzip'))
    expect(unzip).toBeGreaterThanOrEqual(0)
    expect(unzip).toBeLessThan(stop)
  })

  it('keeps the running server when carl cannot be downloaded', async () => {
    const root = await tempRoot('pierre-carl-fail-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0' },
      request: carlReleases('carl-1.2.0'),
      download: async () => {
        throw new Error('réseau coupé')
      }
    })
    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('réseau coupé')
    expect(ctx.calls.some((call) => call.command === 'systemctl' && call.args[0] === 'stop')).toBe(
      false
    )
  })

  it('updates an unconfigured installation without starting the service', async () => {
    const root = await tempRoot('pierre-unconfigured-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(join(assets, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(assets, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    await writeServerChecksums(assets)
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets }
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(root, 'home', 'server', 'current', 'pierre')} --version`.text()).toBe(
      'server-0.41.0\n'
    )
    expect(ctx.calls.some((call) => call.command === 'systemctl' && call.args[0] === 'start')).toBe(
      false
    )
  })

  it('never executes a Server binary before its checksum is verified', async () => {
    const root = await tempRoot('pierre-server-checksum-')
    const assets = join(root, 'assets')
    const executed = join(root, 'executed')
    await mkdir(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeExe(join(assets, 'pierre'), `#!/bin/sh\ntouch "${executed}"\necho server-0.41.0\n`)
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(assets, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    await writeFile(
      join(assets, 'checksums.txt'),
      [`0000  pierre`, `0000  libonnxruntime.so.1`, `0000  pierre-linux-amd64.smolmachine`].join(
        '\n'
      )
    )
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets }
    })

    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(existsSync(executed)).toBe(false)
  })

  it('restores the previous server when the new one stays down', async () => {
    const root = await tempRoot('pierre-update-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(join(assets, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(assets, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    await writeServerChecksums(assets)
    await writeFile(join(root, 'pierre.env'), configuredText())
    await writeFile(join(root, 'pierre'), 'cli stays')
    await writeFile(join(root, 'home', 'datastore.sqlite'), 'database')
    let healthRequests = 0
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets },
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        healthRequests += 1
        return healthRequests <= 120
          ? { status: 0, body: '', url: '' }
          : { status: 200, body: 'ok', url: '' }
      }
    })
    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('La mise à jour du serveur a échoué.')
    expect(
      readFileSync(join(root, 'home', 'server', 'current', 'libonnxruntime.so.1'), 'utf8')
    ).toBe('library')
    expect(readFileSync(join(root, 'pierre'), 'utf8')).toBe('cli stays')
    expect(readFileSync(join(root, 'home', 'datastore.sqlite'), 'utf8')).toBe('database')
  })

  it('restarts the previous server when activation fails before the switch', async () => {
    const root = await tempRoot('pierre-update-activation-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(join(assets, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(assets, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    await writeServerChecksums(assets)
    await writeFile(join(root, 'pierre.env'), configuredText())
    await mkdir(join(root, 'home', 'server', 'current.new'))
    const ctx = testContext(root, {
      env: { PIERRE_SERVER_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets }
    })

    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('La version précédente a été restaurée.')
    expect(
      ctx.calls.some(
        (call) =>
          call.command === 'systemctl' && call.args[0] === 'restart' && call.args[1] === 'pierre'
      )
    ).toBe(true)
    expect(await Bun.$`${join(root, 'home', 'server', 'current', 'pierre')} --version`.text()).toBe(
      'server-0.40.6\n'
    )
  })

  it('installs a checked cli binary without touching the server', async () => {
    const root = await tempRoot('pierre-cli-update-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    const binary = join(assets, 'pierre-cli-linux-x64')
    await writeExe(binary, '#!/bin/sh\necho cli-0.9.1\n')
    await recordChecksum(assets, 'pierre-cli-linux-x64')
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: assets } })
    expect(await installCliRelease(ctx.ctx, 'cli-0.9.1')).toBe(0)
    expect(ctx.out()).toContain('cli-0.9.1')
    expect(readFileSync(join(root, 'home', 'server', 'current', 'pierre'), 'utf8')).toContain(
      'server-0.40.6'
    )
    const installed = await Bun.$`${join(root, 'pierre')} --version`.text()
    expect(installed).toBe('cli-0.9.1\n')
  })

  it('replaces the program before resuming the update with the new binary', async () => {
    const root = await tempRoot('pierre-handoff-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    const binary = join(assets, 'pierre-cli-linux-x64')
    await writeExe(binary, '#!/bin/sh\necho cli-9.9.9\n')
    await recordChecksum(assets, 'pierre-cli-linux-x64')
    await writeServerBundle(root, 'server-0.40.6')
    let handoff = false
    const ctx = testContext(root, {
      env: { PIERRE_ASSET_DIR: assets, PIERRE_CLI_TAG: 'cli-9.9.9' },
      start: (command, args) => {
        if (args[0] === 'update') {
          handoff = args[1] === '--server'
          return {
            finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
            kill: () => undefined
          }
        }
        const proc = Bun.spawn([command, ...args], { stdout: 'pipe', stderr: 'pipe' })
        return {
          finished: Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
            proc.exited
          ]).then(([stdout, stderr, code]) => ({ code, stdout, stderr })),
          kill: () => proc.kill()
        }
      }
    })
    expect(await update(ctx.ctx)).toBe(0)
    expect(handoff).toBe(true)
    expect(await Bun.$`${join(root, 'pierre')} --version`.text()).toBe('cli-9.9.9\n')
  })

  it('keeps the installed cli when the checksum is wrong', async () => {
    const root = await tempRoot('pierre-cli-bad-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeExe(join(assets, 'pierre-cli-linux-x64'), '#!/bin/sh\necho cli-0.9.1\n')
    await writeFile(join(assets, 'checksums.txt'), '0000  pierre-cli-linux-x64\n')
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: assets } })
    expect(await installCliRelease(ctx.ctx, 'cli-0.9.1')).toBe(1)
    expect(readFileSync(join(root, 'pierre'), 'utf8')).toBe('old cli')
  })

  it('does not treat an unreadable server version as up to date', async () => {
    const root = await tempRoot('pierre-bad-version-')
    await writeServerBundle(root, 'server-0.40.6', 'nope')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, { env: { PIERRE_SERVER_TAG: 'server-0.40.6' } })
    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('illisible')
  })
})

describe('maintenance', () => {
  it('waits until the local health endpoint answers and shows the journal on failure', async () => {
    const root = await tempRoot('pierre-restart-')
    const ready = testContext(root)
    expect(await restart(ready.ctx)).toBe(0)
    expect(ready.out()).toContain('Redémarrage')
    const stuck = testContext(root, {
      start: (_command, args) => ({
        finished: Promise.resolve({
          code: 0,
          stdout: args[0] === 'is-active' ? 'inactive\n' : 'pierre: échec du démarrage\n',
          stderr: ''
        }),
        kill: () => undefined
      }),
      request: async () => ({ status: 0, body: '', url: '' })
    })
    expect(await restart(stuck.ctx)).toBe(1)
    expect(stuck.err()).toContain('échec du démarrage')

    const rejected = testContext(root, {
      start: (_command, args) => ({
        finished: Promise.resolve({
          code: args[0] === 'restart' ? 1 : 0,
          stdout: args[0] === 'is-active' ? 'active\n' : '',
          stderr: ''
        }),
        kill: () => undefined
      })
    })
    expect(await restart(rejected.ctx)).toBe(1)
  })

  it('opens less -R +F and removes the temporary journal', async () => {
    const root = await tempRoot('pierre-logs-')
    let killed = false
    let lessArgs: string[] = []
    let lessInherit = false
    let journalText = ''
    const ctx = testContext(root, {
      commandExists: (name) => name === 'less',
      tty: true,
      canPrompt: true,
      start: (command, args, options) => {
        if ((command.split('/').pop() ?? '') === 'less') {
          lessArgs = args
          lessInherit = options?.inherit === true
          journalText = existsSync(args[2] ?? '') ? readFileSync(args[2] ?? '', 'utf8') : ''
          return {
            finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
            kill: () => undefined
          }
        }
        let finish: (result: { code: number; stdout: string; stderr: string }) => void = () =>
          undefined
        const finished = new Promise<{ code: number; stdout: string; stderr: string }>(
          (resolve) => {
            finish = resolve
          }
        )
        return {
          finished,
          kill: () => {
            killed = true
            finish({ code: 0, stdout: '', stderr: '' })
          }
        }
      }
    })
    expect(await logs(ctx.ctx)).toBe(0)
    expect(lessArgs).toEqual(['-R', '+F', expect.any(String)])
    expect(killed).toBe(true)
    expect(existsSync(lessArgs[2] ?? '')).toBe(false)
    expect(journalText).toContain('Ctrl+C quitte')
    expect(lessArgs[0]).toBe('-R')
    expect(lessArgs[1]).toBe('+F')
    expect(lessInherit).toBe(true)
  })

  it('streams the journal in the foreground outside a terminal', async () => {
    const root = await tempRoot('pierre-logs-')
    const seen: Array<{ args: string[]; inherit?: boolean }> = []
    const ctx = testContext(root, {
      tty: false,
      canPrompt: false,
      start: (_command, args, options) => {
        seen.push({ args, inherit: options?.inherit })
        return {
          finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
          kill: () => undefined
        }
      }
    })
    expect(await logs(ctx.ctx)).toBe(0)
    expect(seen[0]?.args).toContain('-f')
    expect(seen[0]?.args).toContain('-u')
    expect(seen[0]?.inherit).toBe(true)
  })

  it('explains how to copy a backup', async () => {
    const root = await tempRoot('pierre-backup-')
    await writeServerBundle(root, 'server-0.40.6')
    await writeExe(
      join(root, 'home', 'server', 'current', 'pierre'),
      "#!/bin/sh\nprintf '/var/lib/pierre/backups/datastore.sqlite\\n'\n"
    )
    await writeFile(join(root, 'pierre.env'), configuredText({ HOST: 'gx.pierre-ia.org' }))
    const ctx = testContext(root, { tty: true })
    const { backup } = await import('../src/commands/backup.ts')
    expect(await backup(ctx.ctx)).toBe(0)
    expect(ctx.out()).toContain('Sauvegarde')
    expect(ctx.out()).toContain(
      'scp root@gx.pierre-ia.org:/var/lib/pierre/backups/datastore.sqlite .'
    )
  })
})

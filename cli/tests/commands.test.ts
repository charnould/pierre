import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, mkdir, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32 } from 'node:zlib'

import { installCliRelease, updateCli } from '../src/commands/cli-release.ts'
import { configure } from '../src/commands/configure.ts'
import { printEnv } from '../src/commands/env.ts'
import {
  activateInstallation,
  finalizeConfiguration,
  installCommand,
  rememberAssetSource,
  rollbackInstallation,
  runInstallation
} from '../src/commands/install.ts'
import { logs } from '../src/commands/logs.ts'
import { restart } from '../src/commands/restart.ts'
import { collectStatus } from '../src/commands/status.ts'
import { updateServer } from '../src/commands/update-server.ts'
import { update } from '../src/commands/update.ts'
import { formatEnv, mergeConfiguration, type ParsedEnv } from '../src/lib/config.ts'
import { configuredText, tempRoot, testContext, writeExe, writeServerBundle } from './support.ts'

const sampleEnv = (): ParsedEnv => {
  const merged = mergeConfiguration({}, { host: 'example.org' }, true)
  if (!merged.ok) throw new Error(merged.error)
  return merged.env
}

async function writeServerChecksums(directory: string) {
  const names = ['pierre', 'libonnxruntime.so.1', 'pierre-linux-amd64.smolmachine']
  const lines = names.map((name) => {
    const digest = createHash('sha256')
      .update(readFileSync(join(directory, name)))
      .digest('hex')
    return `${digest}  ${name}`
  })
  await writeFile(join(directory, 'checksums.txt'), `${lines.join('\n')}\n`)
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

  it('requires the services and the public endpoint, and reads providers without calling them', async () => {
    const root = await tempRoot('pierre-health-')
    await writeFile(join(root, 'pierre.env'), configuredText({ HOST: 'gx.pierre-ia.org' }))
    await writeFile(
      join(root, 'home', 'providers.json'),
      JSON.stringify({
        aiType: 'anthropic',
        aiBaseUrl: 'https://api.anthropic.com',
        aiApiKey: 'sk-test'
      })
    )
    await writeServerBundle(root, 'server-0.40.6')
    const healthy = testContext(root, {
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        if (url.includes('/api/models/carl')) return { status: 200, body: '{}', url }
        if (url.includes('api.anthropic.com')) return { status: 200, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    const { lines } = await collectStatus(healthy.ctx)
    expect(lines.find((line) => line.label === 'www')?.level).toBe('ok')
    expect(lines.find((line) => line.label === 'server')?.level).toBe('ok')
    expect(lines.find((line) => line.label === 'server')?.value).toBe('server-0.40.6')
    expect(lines.find((line) => line.label === 'carl')?.level).toBe('ok')
    expect(lines.find((line) => line.label === 'llm')?.value).toContain('Anthropic')
    expect(lines.find((line) => line.label === 'rcs')?.level).toBe('gap')
    expect(lines.find((line) => line.label === 'email')?.value).toBe('non paramétré')
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
    const { lines: failed } = await collectStatus(down.ctx)
    expect(failed.find((line) => line.label === 'server')?.level).toBe('bad')
    expect(failed.find((line) => line.label === 'carl')?.level).toBe('bad')
    expect(failed.find((line) => line.label === 'www')?.level).toBe('ok')
  })
})

describe('installation atomique', () => {
  it('remembers the asset directory without touching an existing configuration', async () => {
    const root = await tempRoot('pierre-atomic-')
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: '/tmp/pierre-assets' } })
    rememberAssetSource(ctx.ctx)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
    expect(readFileSync(join(root, 'asset-source'), 'utf8')).toBe('/tmp/pierre-assets\n')
  })

  it('publishes the draft only after activation and rolls back a failed one', async () => {
    const root = await tempRoot('pierre-atomic-')
    const env = sampleEnv()
    await writeFile(join(root, 'pierre.env.pending'), formatEnv(env))
    const ctx = testContext(root)
    await activateInstallation(ctx.ctx, env)
    finalizeConfiguration(ctx.ctx)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
    expect(existsSync(join(root, 'pierre.env.pending'))).toBe(false)
    expect(readFileSync(join(root, 'Caddyfile'), 'utf8')).toContain('example.org')

    const failed = await tempRoot('pierre-atomic-fail-')
    await writeFile(join(failed, 'pierre.env.pending'), 'HOST=example.org\n')
    const broken = testContext(failed, {
      start: () => ({
        finished: Promise.resolve({ code: 1, stdout: '', stderr: 'unit failed\n' }),
        kill: () => undefined
      })
    })
    await expect(activateInstallation(broken.ctx, env)).rejects.toThrow('unit failed')
    await rollbackInstallation(broken.ctx)
    expect(existsSync(join(failed, 'pierre.env'))).toBe(false)
    expect(existsSync(join(failed, 'pierre.env.pending'))).toBe(true)
  })

  it('stops at the first failing step without publishing a configuration', async () => {
    const root = await tempRoot('pierre-steps-')
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
    const code = await runInstallation(ctx.ctx)
    expect(code).toBe(1)
    expect(aptCaddy).toBe(true)
    expect(ctx.out()).toContain('Serveur web Caddy')
    expect(readFileSync(join(root, 'install.log'), 'utf8')).toContain('caddy failed clearly')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
  })

  it('installs the software without creating or publishing a configuration', async () => {
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
      },
      start: (command, args) => {
        if (command.endsWith('/smolvm') && args[0] === '--version') {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'smolvm 1.24.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        if (args[0] === '--version' && command.endsWith('/pierre')) {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'server-0.41.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        if ((command.split('/').pop() ?? '') === 'unzip') {
          const dest = args[args.indexOf('-d') + 1]
          if (dest) {
            for (const name of [
              'model.onnx',
              'labels.json',
              'tokenizer.json',
              'tokenizer_config.json'
            ]) {
              writeFileSync(join(dest, name), name)
            }
          }
        }
        return {
          finished: Promise.resolve({ code: 0, stdout: '', stderr: '' }),
          kill: () => undefined
        }
      }
    })
    ctx.ctx.runtime.env['PIERRE_ASSET_DIR'] = root
    await writeExe(join(root, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(root, 'libonnxruntime.so.1'), 'library')
    await writeFile(join(root, 'pierre-linux-amd64.smolmachine'), 'image')
    await writeServerChecksums(root)
    await writeFile(join(root, 'model.zip'), 'zip')
    const code = await installCommand(ctx.ctx)
    expect(code).toBe(0)
    expect(ctx.out()).toContain('pierre configure --host')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(existsSync(join(root, 'pierre.service'))).toBe(true)
    expect(
      ctx.calls.some((call) => call.args[0] === 'restart' && call.args.includes('pierre'))
    ).toBe(false)
  })
})

describe('configuration', () => {
  const args = ['--host', 'example.org']

  it('rejects an incomplete command without writing a file', async () => {
    const root = await tempRoot('pierre-configure-invalid-')
    await writeServerBundle(root, 'server-0.40.6')
    const ctx = testContext(root)
    expect(await configure(ctx.ctx, ['--provider', 'openai'])).toBe(2)
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(existsSync(join(root, 'pierre.env.pending'))).toBe(false)
  })

  it('keeps the generated secrets when the public address does not answer', async () => {
    const root = await tempRoot('pierre-configure-rollback-')
    await writeServerBundle(root, 'server-0.40.6')
    const ctx = testContext(root, {
      request: async (url) => {
        if (url.includes('api.anthropic.com')) return { status: 200, body: '', url }
        if (url.startsWith('https://')) return { status: 0, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    expect(await configure(ctx.ctx, args)).toBe(1)
    const pending = readFileSync(join(root, 'pierre.env.pending'), 'utf8')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(pending).toContain('AUTH_PASSWORD=')
    expect(await configure(ctx.ctx, args)).toBe(1)
    expect(readFileSync(join(root, 'pierre.env.pending'), 'utf8')).toBe(pending)
    expect(ctx.out()).not.toContain('sk-test')
  })

  it('publishes the configuration and shows the first password once', async () => {
    const root = await tempRoot('pierre-configure-ok-')
    await writeServerBundle(root, 'server-0.40.6')
    const ctx = testContext(root)
    expect(await configure(ctx.ctx, args)).toBe(0)
    const env = readFileSync(join(root, 'pierre.env'), 'utf8')
    expect(env).toContain('HOST=example.org')
    expect(env).not.toContain('AI_')
    expect(env).not.toContain('CM_')
    expect(existsSync(join(root, 'pierre.env.pending'))).toBe(false)
    expect(ctx.out()).toContain('admin@pierre-ia.org')
    const password = env.match(/^AUTH_PASSWORD=(.*)$/m)?.[1] ?? ''
    expect(ctx.out()).toContain(password)
    const again = testContext(root)
    expect(await configure(again.ctx, ['--host', 'autre.exemple.org'])).toBe(0)
    expect(again.out()).not.toContain(password)
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain(`AUTH_PASSWORD=${password}`)
  })
})

const CARL_FILES = ['model.onnx', 'labels.json', 'tokenizer.json', 'tokenizer_config.json'] as const

function storedZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name)
    const checksum = crc32(file.data)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(file.data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    locals.push(local, file.data)
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(file.data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)
    offset += local.length + file.data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

async function writeCarlZip(directory: string) {
  const files = CARL_FILES.map((name) => ({ name, data: Buffer.from(name) }))
  await writeFile(join(directory, 'model.zip'), storedZip(files))
}

async function writeInstalledCarl(root: string, tag: string) {
  const dir = join(root, 'home', 'models', 'carl')
  await mkdir(dir, { recursive: true })
  for (const name of CARL_FILES) await writeFile(join(dir, name), name)
  await writeFile(join(dir, 'version'), `${tag}\n`)
}

function carlReleases(tag: string) {
  return async (url: string) => {
    if (url.includes('api.github.com')) {
      return {
        status: 200,
        body: JSON.stringify([{ tag_name: tag, draft: false, prerelease: false, assets: [] }]),
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
    const ctx = testContext(root, { env: { PIERRE_UPDATE_TAG: 'server-0.40.6' } })
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
      env: { PIERRE_UPDATE_TAG: 'server-0.40.6' },
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
      env: { PIERRE_UPDATE_TAG: 'server-0.40.6', PIERRE_ASSET_DIR: assets },
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
    const ctx = testContext(root, {
      env: { PIERRE_UPDATE_TAG: 'server-0.40.6', PIERRE_ASSET_DIR: assets },
      request: carlReleases('carl-1.0.0')
    })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(existsSync(join(dir, 'tokenizer.json'))).toBe(true)
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
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets },
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
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0' },
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
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets }
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
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets }
    })

    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(existsSync(executed)).toBe(false)
  })

  it('replaces the server and ONNX, then restores both when the new server stays down', async () => {
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
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets },
      request: async (url) => {
        if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
        healthRequests += 1
        return healthRequests <= 120
          ? { status: 0, body: '', url: '' }
          : { status: 200, body: 'ok', url: '' }
      }
    })
    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('version précédente a été restaurée')
    expect(
      readFileSync(join(root, 'home', 'server', 'current', 'libonnxruntime.so.1'), 'utf8')
    ).toBe('library')
    expect(readFileSync(join(root, 'pierre'), 'utf8')).toBe('cli stays')
    expect(readFileSync(join(root, 'home', 'datastore.sqlite'), 'utf8')).toBe('database')
  })

  it('installs a checked cli binary without touching the server', async () => {
    const root = await tempRoot('pierre-cli-update-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    const binary = join(assets, 'pierre-cli-linux-x64')
    await writeExe(binary, '#!/bin/sh\necho cli-0.9.1\n')
    chmodSync(binary, 0o755)
    const hash = createHash('sha256').update(readFileSync(binary)).digest('hex')
    await writeFile(join(assets, 'checksums.txt'), `${hash}  pierre-cli-linux-x64\n`)
    await writeServerBundle(root, 'server-0.40.6')
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: assets } })
    expect(await installCliRelease(ctx.ctx, 'cli-0.9.1')).toBe(0)
    expect(ctx.out()).toContain('cli-0.9.1 est installé')
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
    const hash = createHash('sha256').update(readFileSync(binary)).digest('hex')
    await writeFile(join(assets, 'checksums.txt'), `${hash}  pierre-cli-linux-x64\n`)
    await writeServerBundle(root, 'server-0.40.6')
    let handoff = false
    const ctx = testContext(root, {
      env: { PIERRE_ASSET_DIR: assets, PIERRE_CLI_UPDATE_TAG: 'cli-9.9.9' },
      start: (command, args, options) => {
        if (args[0] === 'update') {
          handoff = options?.env?.['PIERRE_UPDATE_HANDOFF'] === '1'
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

  it('recovers an interrupted cli update before checking for a new release', async () => {
    const root = await tempRoot('pierre-cli-recover-')
    await writeExe(join(root, 'pierre'), '#!/bin/sh\necho broken\n')
    await writeExe(join(root, 'pierre.previous'), '#!/bin/sh\necho cli-0.9.1\n')
    const ctx = testContext(root, { env: { PIERRE_CLI_UPDATE_TAG: 'cli-0.9.1' } })
    expect(await updateCli(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(root, 'pierre')} --version`.text()).toBe('cli-0.9.1\n')
    expect(existsSync(join(root, 'pierre.previous'))).toBe(false)
    expect(ctx.out()).toContain('Restauration de la mise à jour cli interrompue')
  })

  it('recovers an interrupted server update before checking for a new release', async () => {
    const root = await tempRoot('pierre-server-recover-')
    const previous = await writeServerBundle(root, 'server-0.40.6')
    const broken = join(root, 'home', 'server', 'releases', 'server-9.9.9')
    await mkdir(broken)
    await writeExe(join(broken, 'pierre'), '#!/bin/sh\necho server-9.9.9\n')
    await writeFile(join(broken, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(broken, 'pierre-linux-amd64.smolmachine'), 'new microvm')
    const current = join(root, 'home', 'server', 'current')
    await unlink(current)
    await symlink(broken, current)
    await writeFile(
      join(root, 'home', 'server', 'update.json'),
      `${JSON.stringify({ previous })}\n`
    )
    await writeFile(join(root, 'pierre.env'), configuredText())
    const ctx = testContext(root, { env: { PIERRE_UPDATE_TAG: 'server-0.40.6' } })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(current, 'pierre')} --version`.text()).toBe('server-0.40.6\n')
    expect(readFileSync(join(current, 'libonnxruntime.so.1'), 'utf8')).toBe('library')
    expect(existsSync(join(root, 'home', 'server', 'update.json'))).toBe(false)
    expect(ctx.out()).toContain('Restauration de la mise à jour serveur interrompue')
  })
})

describe('maintenance', () => {
  it('waits until the local health endpoint answers and shows the journal on failure', async () => {
    const root = await tempRoot('pierre-restart-')
    const ready = testContext(root)
    expect(await restart(ready.ctx)).toBe(0)
    expect(ready.out()).toContain('Redémarrage en cours terminé.')
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
    expect(ctx.out()).toContain('La sauvegarde est terminée.')
    expect(ctx.out()).toContain(
      'scp root@gx.pierre-ia.org:/var/lib/pierre/backups/datastore.sqlite .'
    )
  })
})

describe('bootstrap', () => {
  const script = join(import.meta.dir, '../scripts/install.sh')

  it('refuses a non-root or non-linux machine before downloading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const bin = join(root, 'bin')
      await mkdir(bin)
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 1000\n')
      const proc = Bun.spawn(['sh', script], {
        env: { PATH: `${bin}:/usr/bin:/bin`, HOME: root, TMPDIR: root },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const stderr = await new Response(proc.stderr).text()
      expect(await proc.exited).toBe(1)
      expect(stderr).toContain('Il faut être root.')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('installs a checked local binary and runs pierre install', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const assets = join(root, 'assets')
      const destDir = join(root, 'dest')
      await mkdir(assets)
      await mkdir(destDir)
      const binary = join(assets, 'pierre-cli-linux-x64')
      await writeExe(binary, '#!/bin/sh\necho "$@"; echo installed\n')
      const hash = createHash('sha256').update(readFileSync(binary)).digest('hex')
      await writeFile(join(assets, 'checksums.txt'), `${hash}  pierre-cli-linux-x64\n`)
      const bin = join(root, 'bin')
      await mkdir(bin)
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 0\n')
      const dest = join(destDir, 'pierre')
      const proc = Bun.spawn(['sh', script], {
        env: {
          PATH: `${bin}:/usr/bin:/bin:/usr/sbin`,
          HOME: root,
          TMPDIR: root,
          PIERRE_CLI_ASSET_DIR: assets,
          PIERRE_CLI_DEST: dest
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])
      expect(code).toBe(0)
      expect(stderr).toBe('')
      expect(stdout).toContain('install')
      expect(stdout).toContain('installed')
      expect(existsSync(dest)).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('can verify the published cli without starting the server installation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pierre-boot-'))
    try {
      const assets = join(root, 'assets')
      const destDir = join(root, 'dest')
      const bin = join(root, 'bin')
      await Promise.all([mkdir(assets), mkdir(destDir), mkdir(bin)])
      const binary = join(assets, 'pierre-cli-linux-x64')
      await writeExe(
        binary,
        '#!/bin/sh\n[ "$1" = "--version" ] || exit 99\nprintf "cli-0.9.1\\n"\n'
      )
      const hash = createHash('sha256').update(readFileSync(binary)).digest('hex')
      await writeFile(join(assets, 'checksums.txt'), `${hash}  pierre-cli-linux-x64\n`)
      await writeExe(
        join(bin, 'uname'),
        '#!/bin/sh\nif [ "$1" = "-s" ]; then echo Linux; else echo x86_64; fi\n'
      )
      await writeExe(join(bin, 'id'), '#!/bin/sh\necho 0\n')
      const dest = join(destDir, 'pierre')
      const proc = Bun.spawn(['sh', script], {
        env: {
          PATH: `${bin}:/usr/bin:/bin:/usr/sbin`,
          HOME: root,
          TMPDIR: root,
          PIERRE_BOOTSTRAP_ONLY: '1',
          PIERRE_CLI_ASSET_DIR: assets,
          PIERRE_CLI_DEST: dest
        },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])
      expect(code).toBe(0)
      expect(stderr).toBe('')
      expect(stdout).toBe('cli-0.9.1\n')
      expect(existsSync(dest)).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

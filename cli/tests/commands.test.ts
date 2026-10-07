import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { collectDashboard } from '../src/commands/dashboard.ts'
import { printEnv } from '../src/commands/env.ts'
import {
  activateInstallation,
  finalizeInstallation,
  installCommand,
  prepareInstallDraft,
  rememberAssetSource,
  rollbackInstallation,
  runInstallation
} from '../src/commands/install.ts'
import { logs } from '../src/commands/logs.ts'
import { restart } from '../src/commands/restart.ts'
import { installCliRelease, updateCli } from '../src/commands/update-cli.ts'
import { updateServer } from '../src/commands/update-server.ts'
import { formatEnv, parseDotenv, type ParsedEnv } from '../src/lib/config.ts'
import { block, tempRoot, testContext, writeExe } from './support.ts'

const sampleEnv = (): ParsedEnv => {
  const parsed = parseDotenv(block(), 'install', {}, (bytes) => 'ab'.repeat(bytes))
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.env
}

describe('environnement et santé', () => {
  it('prints the dotenv block in stable order, secrets included', async () => {
    const root = await tempRoot('pierre-env-')
    const file = join(root, 'pierre.env')
    await writeFile(
      file,
      [
        'CM_FROM=PIERRE',
        'AI_API_KEY=sk=value',
        'HOST=example.org',
        'AUTH_PASSWORD=password1',
        `AUTH_SECRET=${'s'.repeat(32)}`,
        'AUTH_BEARER=bearer',
        'AI_TYPE=anthropic',
        'AI_BASE_URL=https://api.anthropic.com',
        'CM_PRODUCT_TOKEN=00000000-0000-0000-0000-000000000000',
        'CM_WEBHOOK_SECRET=webhook',
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
        'AI_TYPE=anthropic',
        'AI_BASE_URL=https://api.anthropic.com',
        'AI_API_KEY=sk=value',
        'CM_PRODUCT_TOKEN=00000000-0000-0000-0000-000000000000',
        'CM_FROM=PIERRE',
        'CM_WEBHOOK_SECRET=webhook',
        ''
      ].join('\n')
    )
    const missing = testContext(await tempRoot('pierre-env-missing-'))
    expect(printEnv(missing.ctx)).toBe(1)
    expect(missing.err()).toContain('PIERRE n’est pas configuré.')
  })

  it('requires the services and the public endpoint, and distinguishes a refused key', async () => {
    const root = await tempRoot('pierre-health-')
    await writeFile(
      join(root, 'pierre.env'),
      'HOST=gx.pierre-ia.org\nAI_TYPE=anthropic\nAI_BASE_URL=https://api.anthropic.com\nAI_API_KEY=sk-test\n'
    )
    const healthy = testContext(root, {
      request: async (url) => {
        if (url.includes('/api/models/carl')) return { status: 200, body: '{}', url }
        if (url.includes('api.anthropic.com')) return { status: 200, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    const dash = await collectDashboard(healthy.ctx)
    expect(dash.networkOk).toBe(true)
    expect(dash.pierreOk).toBe(true)
    expect(dash.carlOk).toBe(true)
    expect(dash.providerStatus).toBe('connecté')
    expect(healthy.calls.some((call) => call.args.join(' ').includes('api.anthropic.com'))).toBe(
      false
    )
    const refused = testContext(root, {
      request: async (url) => {
        if (url.includes('api.anthropic.com')) return { status: 401, body: '', url }
        return { status: 200, body: 'ok', url }
      }
    })
    expect((await collectDashboard(refused.ctx)).providerStatus).toBe('clé refusée')
    const down = testContext(root, {
      start: (_command, args) => ({
        finished: Promise.resolve({
          code: 0,
          stdout: args.join(' ').includes('pierre') ? 'inactive\n' : 'active\n',
          stderr: ''
        }),
        kill: () => undefined
      }),
      request: async () => ({ status: 200, body: 'ok', url: '' })
    })
    const failed = await collectDashboard(down.ctx)
    expect(failed.pierreOk).toBe(false)
    expect(failed.carlStatus).toBe('indisponible')
    expect(failed.networkOk).toBe(true)
  })
})

describe('installation atomique', () => {
  it('moves an incomplete configuration back to a draft and remembers the asset directory', async () => {
    const root = await tempRoot('pierre-atomic-')
    await writeFile(join(root, 'pierre.env'), 'HOST=example.org\nAI_API_KEY=secret\n')
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: '/tmp/pierre-assets' } })
    prepareInstallDraft(ctx.ctx)
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(readFileSync(join(root, 'pierre.env.pending'), 'utf8')).toContain('AI_API_KEY=secret')
    rememberAssetSource(ctx.ctx)
    expect(readFileSync(join(root, 'asset-source'), 'utf8')).toBe('/tmp/pierre-assets\n')
  })

  it('publishes the draft only after activation and rolls back a failed one', async () => {
    const root = await tempRoot('pierre-atomic-')
    const env = sampleEnv()
    await writeFile(join(root, 'pierre.env.pending'), formatEnv(env))
    const ctx = testContext(root)
    await activateInstallation(ctx.ctx, env)
    finalizeInstallation(ctx.ctx)
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

  it('stops at the first failing step and keeps the draft', async () => {
    const root = await tempRoot('pierre-steps-')
    await writeFile(join(root, 'pierre.env.pending'), 'HOST=example.org\nAI_API_KEY=never-log-me\n')
    let aptCaddy = false
    const ctx = testContext(root, {
      start: (command, args) => {
        const name = command.split('/').pop()
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
    const code = await runInstallation(ctx.ctx, sampleEnv())
    expect(code).toBe(1)
    expect(aptCaddy).toBe(true)
    expect(ctx.out()).toContain('Serveur web Caddy')
    expect(readFileSync(join(root, 'install.log'), 'utf8')).toContain('caddy failed clearly')
    expect(readFileSync(join(root, 'install.log'), 'utf8')).not.toContain('never-log-me')
    expect(existsSync(join(root, 'pierre.env'))).toBe(false)
    expect(existsSync(join(root, 'pierre.env.pending'))).toBe(true)
  })

  it('installs from stdin without printing secrets', async () => {
    const root = await tempRoot('pierre-stdin-')
    const ctx = testContext(root, {
      stdinTTY: false,
      readStdin: async () => block(),
      request: async (url) => {
        if (url.includes('/releases/tags/microvm')) {
          return {
            status: 200,
            body: JSON.stringify({
              assets: [{ name: 'pierre-amd64.smolmachine', digest: 'sha256:abc' }]
            }),
            url
          }
        }
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
        if (args[0] === '--version' && command.endsWith('/pierre')) {
          return {
            finished: Promise.resolve({ code: 0, stdout: 'server-0.41.0\n', stderr: '' }),
            kill: () => undefined
          }
        }
        if ((command.split('/').pop() ?? '') === 'unzip') {
          const dest = args[args.indexOf('-d') + 1]
          if (dest) writeFileSync(join(dest, 'model.onnx'), 'model')
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
    await writeFile(join(root, 'pierre-amd64.smolmachine'), 'image')
    await writeFile(join(root, 'model.zip'), 'zip')
    const code = await installCommand(ctx.ctx)
    expect(code).toBe(0)
    expect(ctx.out()).not.toContain('sk-test')
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).toContain('HOST=example.org')
    expect(readFileSync(join(root, 'pierre.env'), 'utf8')).not.toContain('AUTO')
  })
})

describe('mises à jour séparées', () => {
  it('does not download when the server is current and never touches the cli', async () => {
    const root = await tempRoot('pierre-update-')
    await writeExe(join(root, 'pierre-server'), '#!/bin/sh\necho server-0.40.6\n')
    await writeFile(join(root, 'pierre.env'), 'HOST=example.org\n')
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_UPDATE_TAG: 'server-0.40.6' } })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(ctx.out()).toContain('server-0.40.6 est déjà à jour.')
    expect(readFileSync(join(root, 'pierre'), 'utf8')).toBe('old cli')
  })

  it('replaces the server and ONNX, then restores both when the new server stays down', async () => {
    const root = await tempRoot('pierre-update-')
    const assets = join(root, 'assets')
    await mkdir(assets)
    await writeExe(join(root, 'pierre-server'), '#!/bin/sh\necho server-0.40.6\n')
    await writeExe(join(assets, 'pierre'), '#!/bin/sh\necho server-0.41.0\n')
    await writeFile(join(root, 'libonnxruntime.so.1'), 'old library')
    await writeFile(join(assets, 'libonnxruntime.so.1'), 'new library')
    await writeFile(join(root, 'pierre.env'), 'HOST=example.org\n')
    await writeFile(join(root, 'pierre'), 'cli stays')
    await writeFile(join(root, 'home', 'datastore.sqlite'), 'database')
    let healthRequests = 0
    const ctx = testContext(root, {
      env: { PIERRE_UPDATE_TAG: 'server-0.41.0', PIERRE_ASSET_DIR: assets },
      request: async () => {
        healthRequests += 1
        return healthRequests <= 120
          ? { status: 0, body: '', url: '' }
          : { status: 200, body: 'ok', url: '' }
      }
    })
    expect(await updateServer(ctx.ctx)).toBe(1)
    expect(ctx.err()).toContain('version précédente a été restaurée')
    expect(readFileSync(join(root, 'libonnxruntime.so.1'), 'utf8')).toBe('old library')
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
    await writeExe(join(root, 'pierre-server'), '#!/bin/sh\necho server-0.40.6\n')
    await writeFile(join(root, 'pierre'), 'old cli')
    const ctx = testContext(root, { env: { PIERRE_ASSET_DIR: assets } })
    expect(await installCliRelease(ctx.ctx, 'cli-0.9.1')).toBe(0)
    expect(ctx.out()).toContain('cli-0.9.1 est installé')
    expect(readFileSync(join(root, 'pierre-server'), 'utf8')).toContain('server-0.40.6')
    const installed = await Bun.$`${join(root, 'pierre')} --version`.text()
    expect(installed).toBe('cli-0.9.1\n')
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
    const previous = join(root, 'pierre-server.previous')
    await mkdir(previous)
    await writeExe(join(root, 'pierre-server'), '#!/bin/sh\necho server-9.9.9\n')
    await writeFile(join(root, 'libonnxruntime.so.1'), 'new library')
    await writeExe(join(previous, 'pierre'), '#!/bin/sh\necho server-0.40.6\n')
    await writeFile(join(previous, 'libonnxruntime.so.1'), 'old library')
    await writeFile(join(root, 'pierre.env'), 'HOST=example.org\n')
    const ctx = testContext(root, { env: { PIERRE_UPDATE_TAG: 'server-0.40.6' } })
    expect(await updateServer(ctx.ctx)).toBe(0)
    expect(await Bun.$`${join(root, 'pierre-server')} --version`.text()).toBe('server-0.40.6\n')
    expect(readFileSync(join(root, 'libonnxruntime.so.1'), 'utf8')).toBe('old library')
    expect(existsSync(previous)).toBe(false)
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
    expect(journalText).toContain('Ctrl+C suspend le direct')
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
    await writeExe(
      join(root, 'pierre-server'),
      "#!/bin/sh\nprintf '/var/lib/pierre/backups/datastore.sqlite\\n'\n"
    )
    await writeFile(join(root, 'pierre.env'), 'HOST=gx.pierre-ia.org\n')
    const ctx = testContext(root)
    ctx.ctx.runtime.uiActive = true
    const { backup } = await import('../src/commands/backup.ts')
    expect(await backup(ctx.ctx, true)).toBe(0)
    expect(ctx.out()).toContain('  ✓ La sauvegarde est terminée.')
    expect(ctx.out()).toContain(
      '  scp root@gx.pierre-ia.org:/var/lib/pierre/backups/datastore.sqlite .'
    )
    expect(
      ctx
        .out()
        .split('\n')
        .filter(Boolean)
        .every((line) => line.startsWith('  '))
    ).toBe(true)
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

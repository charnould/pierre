import { chmod, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createRuntime,
  type CommandResult,
  type Context,
  type RuntimeOverrides
} from '../src/lib/system.ts'
import { CLI_VERSION } from '../src/version.ts'

export const block = (changes: Record<string, string> = {}) =>
  [
    `HOST=${changes['HOST'] ?? 'example.org'}`,
    `AUTH_PASSWORD=${changes['AUTH_PASSWORD'] ?? 'password1'}`,
    `AUTH_SECRET=${changes['AUTH_SECRET'] ?? 'AUTO'}`,
    `AUTH_BEARER=${changes['AUTH_BEARER'] ?? 'AUTO'}`,
    `AI_TYPE=${changes['AI_TYPE'] ?? 'anthropic'}`,
    `AI_BASE_URL=${changes['AI_BASE_URL'] ?? 'https://api.anthropic.com'}`,
    `AI_API_KEY=${changes['AI_API_KEY'] ?? 'sk-test'}`,
    `CM_PRODUCT_TOKEN=${changes['CM_PRODUCT_TOKEN'] ?? ''}`,
    `CM_FROM=${changes['CM_FROM'] ?? ''}`,
    `CM_WEBHOOK_SECRET=${changes['CM_WEBHOOK_SECRET'] ?? 'AUTO'}`,
    ''
  ].join('\n')

export const writeExe = async (path: string, body: string) => {
  await writeFile(path, body)
  await chmod(path, 0o755)
}

export async function tempRoot(prefix: string) {
  const root = await mkdtemp(join(tmpdir(), prefix))
  await mkdir(join(root, 'home'), { recursive: true })
  const smolvmRelease = join(root, 'smolvm-runtime', 'releases', '1.24.0')
  await mkdir(smolvmRelease, { recursive: true })
  await writeExe(join(smolvmRelease, 'smolvm'), '#!/bin/sh\necho "smolvm 1.24.0"\n')
  const smolvm = await Bun.file(join(smolvmRelease, 'smolvm')).arrayBuffer()
  const digest = new Bun.CryptoHasher('sha256').update(smolvm).digest('hex')
  await writeFile(join(smolvmRelease, 'checksums.txt'), `${digest}  smolvm\n`)
  await symlink(smolvmRelease, join(root, 'smolvm-runtime', 'current'))
  await symlink(join(root, 'smolvm-runtime', 'current', 'smolvm'), join(root, 'smolvm'))
  return root
}

export async function writeServerBundle(root: string, tag: string, version = tag): Promise<string> {
  const serverRoot = join(root, 'home', 'server')
  const release = join(serverRoot, 'releases', tag)
  await mkdir(release, { recursive: true })
  await writeExe(join(release, 'pierre'), `#!/bin/sh\necho ${version}\n`)
  await writeFile(join(release, 'libonnxruntime.so.1'), 'library')
  await writeFile(join(release, 'pierre-linux-amd64.smolmachine'), 'microvm')
  await symlink(release, join(serverRoot, 'current'))
  return release
}

export function testContext(root: string, overrides: RuntimeOverrides = {}) {
  let out = ''
  let err = ''
  const calls: Array<{ command: string; args: string[] }> = []
  const env = {
    NO_COLOR: '1',
    COLUMNS: '100',
    PIERRE_HOME_DIR: join(root, 'home'),
    PIERRE_ENV_FILE: join(root, 'pierre.env'),
    PIERRE_PENDING_ENV_FILE: join(root, 'pierre.env.pending'),
    PIERRE_PREVIOUS_ENV_FILE: join(root, 'pierre.env.previous'),
    PIERRE_INSTALL_LOG: join(root, 'install.log'),
    PIERRE_ASSET_SOURCE_FILE: join(root, 'asset-source'),
    PIERRE_LEGACY_BIN: join(root, 'legacy-pierre'),
    PIERRE_LEGACY_SO: join(root, 'legacy-libonnxruntime.so.1'),
    PIERRE_SERVER_ROOT: join(root, 'home', 'server'),
    PIERRE_CMD: join(root, 'pierre'),
    PIERRE_UNIT_FILE: join(root, 'pierre.service'),
    PIERRE_CARL_UNIT: join(root, 'carl.service'),
    PIERRE_CADDY_FILE: join(root, 'Caddyfile'),
    PIERRE_PREVIOUS_CADDY_FILE: join(root, 'Caddyfile.previous'),
    PIERRE_SMOLVM_BIN: join(root, 'smolvm'),
    PIERRE_SMOLVM_HOME: join(root, 'smolvm-home'),
    PIERRE_SMOLVM_ROOT: join(root, 'smolvm-runtime'),
    ...overrides.env
  }
  const runtime = createRuntime({
    tty: false,
    stdinTTY: false,
    canPrompt: false,
    columns: 100,
    uid: () => 0,
    arch: () => 'x86_64',
    kvm: () => true,
    writeOut: (text) => {
      out += text
    },
    writeErr: (text) => {
      err += text
    },
    sleep: async () => undefined,
    randomHex: (bytes) => 'ab'.repeat(bytes),
    readStdin: async () => '',
    readLine: async () => null,
    readKey: async () => null,
    commandExists: () => false,
    request: async () => ({ status: 200, body: 'ok', url: '' }),
    start: (command, args) => {
      calls.push({ command, args })
      const name = command.split('/').pop() ?? command
      if (name === 'systemctl' && args[0] === 'is-active' && args[1] !== '--quiet') {
        return child({ code: 0, stdout: 'active\n', stderr: '' })
      }
      if (STUBBED.has(name)) return child({ code: 0, stdout: '', stderr: '' })
      const proc = Bun.spawn([command, ...args], { stdout: 'pipe', stderr: 'pipe' })
      return {
        finished: Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited
        ]).then(([stdout, stderr, code]) => ({ code, stdout, stderr })),
        kill: () => {
          proc.kill()
        }
      }
    },
    ...overrides,
    env
  })
  const ctx: Context = { runtime, version: CLI_VERSION }
  return {
    ctx,
    calls,
    out: () => out,
    err: () => err
  }
}

const STUBBED = new Set([
  'systemctl',
  'ldconfig',
  'journalctl',
  'less',
  'stty',
  'apt-get',
  'bash',
  'ln',
  'gpg',
  'tee',
  'curl'
])

const child = (result: CommandResult) => ({
  finished: Promise.resolve(result),
  kill: () => undefined
})

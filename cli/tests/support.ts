import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32 } from 'node:zlib'

import { CARL_MODEL_FILES } from '../../shared/carl-model.ts'
import {
  createRuntime,
  type CommandResult,
  type Context,
  type RuntimeOverrides
} from '../src/lib/system.ts'
import { CLI_VERSION } from '../src/version.ts'

export const configuredText = (changes: Record<string, string> = {}) =>
  [
    `HOST=${changes['HOST'] ?? 'example.org'}`,
    `AUTH_PASSWORD=${changes['AUTH_PASSWORD'] ?? 'password-1234'}`,
    `AUTH_SECRET=${changes['AUTH_SECRET'] ?? 'ab'.repeat(32)}`,
    `AUTH_BEARER=${changes['AUTH_BEARER'] ?? 'cd'.repeat(32)}`,
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

export async function recordChecksum(directory: string, name: string) {
  const digest = createHash('sha256')
    .update(await readFile(join(directory, name)))
    .digest('hex')
  const file = join(directory, 'checksums.txt')
  const kept = existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => {
          const label = line.trim().split(/\s+/)[1]?.replace(/^\*/, '')
          return label && label !== name
        })
    : []
  kept.push(`${digest}  ${name}`)
  await writeFile(file, `${kept.join('\n')}\n`)
}

export function storedZip(files: Array<{ name: string; data: Buffer }>): Buffer {
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

export async function writeCarlZip(directory: string) {
  const files = CARL_MODEL_FILES.map((name) => ({ name, data: Buffer.from(name) }))
  await writeFile(join(directory, 'model.zip'), storedZip(files))
  await recordChecksum(directory, 'model.zip')
}

export function testContext(root: string, overrides: RuntimeOverrides = {}) {
  let out = ''
  let err = ''
  const calls: Array<{ command: string; args: string[] }> = []
  const env = {
    NO_COLOR: '1',
    COLUMNS: '100',
    PIERRE_HOME_DIR: join(root, 'home'),
    PIERRE_LOCK_FILE: join(root, 'pierre.lock'),
    PIERRE_ENV_FILE: join(root, 'pierre.env'),
    PIERRE_INSTALL_LOG: join(root, 'install.log'),
    PIERRE_ASSET_SOURCE_FILE: join(root, 'asset-source'),
    PIERRE_CMD: join(root, 'pierre'),
    PIERRE_UNIT_DIR: root,
    PIERRE_CADDY_FILE: join(root, 'Caddyfile'),
    PIERRE_SMOLVM_BIN: join(root, 'smolvm'),
    PIERRE_SMOLVM_HOME: join(root, 'smolvm-home'),
    PIERRE_SMOLVM_ROOT: join(root, 'smolvm-runtime'),
    ...overrides.env
  }
  const runtime = createRuntime({
    tty: false,
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
    readLine: async () => null,
    commandExists: () => false,
    request: async (url) => {
      if (url.includes('api.github.com')) return { status: 200, body: '[]', url }
      return { status: 200, body: 'ok', url }
    },
    start: (command, args) => {
      calls.push({ command, args })
      const name = command.split('/').pop() ?? command
      if (name === 'dpkg-query') return child({ code: 1, stdout: '', stderr: '' })
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

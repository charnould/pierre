import { closeSync, existsSync, openSync, readSync } from 'node:fs'
import { join } from 'node:path'

export class Exit extends Error {
  constructor(
    message: string,
    readonly code = 1
  ) {
    super(message)
  }
}

export class CommandFailed extends Error {
  constructor(
    readonly code: number,
    readonly output: string
  ) {
    super(output)
  }
}

type Env = Record<string, string | undefined>

type Paths = {
  home: string
  lockFile: string
  envFile: string
  installLog: string
  assetSourceFile: string
  serverRoot: string
  serverReleases: string
  serverCurrent: string
  bin: string
  cmd: string
  unitFile: string
  caddyFile: string
  smolvmBin: string
  smolvmHome: string
  smolvmReleases: string
  smolvmRoot: string
  smolvmRuntime: string
}

export type CommandResult = { code: number; stdout: string; stderr: string }

export type SpawnOptions = {
  input?: string
  env?: Env
  stdoutFile?: string
  append?: boolean
  inherit?: boolean
}

type Child = {
  finished: Promise<CommandResult>
  kill: () => void
}

type HttpResult = { status: number; body: string; url: string }

type RequestOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

type Palette = {
  cyan: string
  green: string
  yellow: string
  red: string
  bold: string
  dim: string
  reset: string
}

export type Runtime = {
  env: Env
  paths: Paths
  palette: Palette
  tty: boolean
  canPrompt: boolean
  columns: number
  uid: () => number
  arch: () => string
  kvm: () => boolean
  writeOut: (text: string) => void
  writeErr: (text: string) => void
  start: (command: string, args: string[], options?: SpawnOptions) => Child
  request: (url: string, options?: RequestOptions) => Promise<HttpResult>
  download: (url: string, dest: string) => Promise<void>
  sleep: (ms: number) => Promise<void>
  readLine: () => Promise<string | null>
  commandExists: (name: string) => boolean
  onInterrupt?: () => void
}

export type Context = {
  runtime: Runtime
  version: string
}

const envOr = (env: Env, key: string, fallback: string) => {
  const value = env[key]
  return value && value.length > 0 ? value : fallback
}

function resolvePaths(env: Env): Paths {
  const envFile = envOr(env, 'PIERRE_ENV_FILE', '/etc/pierre.env')
  const caddyFile = envOr(env, 'PIERRE_CADDY_FILE', '/etc/caddy/Caddyfile')
  const home = envOr(env, 'PIERRE_HOME_DIR', '/var/lib/pierre')
  const serverRoot = join(home, 'server')
  const serverCurrent = join(serverRoot, 'current')
  const smolvmRoot = envOr(env, 'PIERRE_SMOLVM_ROOT', '/usr/local/lib/smolvm')
  const unitDir = envOr(env, 'PIERRE_UNIT_DIR', '/etc/systemd/system')
  return {
    home,
    lockFile: envOr(env, 'PIERRE_LOCK_FILE', '/run/lock/pierre.lock'),
    envFile,
    installLog: envOr(env, 'PIERRE_INSTALL_LOG', '/var/log/pierre-install.log'),
    assetSourceFile: envOr(env, 'PIERRE_ASSET_SOURCE_FILE', '/etc/pierre-install-source'),
    serverRoot,
    serverReleases: join(serverRoot, 'releases'),
    serverCurrent,
    bin: join(serverCurrent, 'pierre'),
    cmd: envOr(env, 'PIERRE_CMD', '/usr/local/bin/pierre'),
    unitFile: join(unitDir, 'pierre.service'),
    caddyFile,
    smolvmBin: envOr(env, 'PIERRE_SMOLVM_BIN', '/usr/local/bin/smolvm'),
    smolvmHome: envOr(env, 'PIERRE_SMOLVM_HOME', '/root/.smolvm'),
    smolvmRoot,
    smolvmReleases: join(smolvmRoot, 'releases'),
    smolvmRuntime: join(smolvmRoot, 'current')
  }
}

const paletteFor = (enabled: boolean): Palette =>
  enabled
    ? {
        cyan: '\u001b[1m\u001b[36m',
        green: '\u001b[32m',
        yellow: '\u001b[33m',
        red: '\u001b[31m',
        bold: '\u001b[1m',
        dim: '\u001b[2m',
        reset: '\u001b[0m'
      }
    : { cyan: '', green: '', yellow: '', red: '', bold: '', dim: '', reset: '' }

const bunEnv = (): Env => {
  const env: Env = {}
  for (const [key, value] of Object.entries(process.env)) env[key] = value
  return env
}

const hasControllingTty = () => {
  try {
    const fd = openSync('/dev/tty', 'r')
    closeSync(fd)
    return true
  } catch {
    return false
  }
}

const defaultStart = (command: string, args: string[], options?: SpawnOptions): Child => {
  const env = options?.env ? { ...process.env, ...options.env } : undefined
  if (options?.inherit) {
    const proc = Bun.spawn([command, ...args], {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env
    })
    return {
      finished: proc.exited.then((code) => ({ code, stdout: '', stderr: '' })),
      kill: () => proc.kill()
    }
  }
  const stdin = options?.input ? new TextEncoder().encode(options.input) : 'ignore'
  if (options?.stdoutFile) {
    const stdoutFd = openSync(options.stdoutFile, options.append ? 'a' : 'w')
    const proc = Bun.spawn([command, ...args], {
      stdout: stdoutFd,
      stderr: 'pipe',
      stdin,
      env
    })
    const finished = (async () => {
      const stderr = await new Response(proc.stderr).text()
      const code = await proc.exited
      closeSync(stdoutFd)
      return { code, stdout: '', stderr }
    })()
    return { finished, kill: () => proc.kill() }
  }
  const proc = Bun.spawn([command, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin,
    env
  })
  const finished = (async () => {
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited
    ])
    return { code, stdout, stderr }
  })()
  return { finished, kill: () => proc.kill() }
}

const defaultRequest = async (url: string, options?: RequestOptions): Promise<HttpResult> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 10_000)
  try {
    const response = await fetch(url, {
      method: options?.method ?? 'GET',
      headers: options?.headers,
      body: options?.body,
      redirect: 'follow',
      signal: controller.signal
    })
    return { status: response.status, body: await response.text(), url: response.url }
  } catch {
    return { status: 0, body: '', url }
  } finally {
    clearTimeout(timeout)
  }
}

export type RuntimeOverrides = {
  env?: Env
  tty?: boolean
  canPrompt?: boolean
  columns?: number
  uid?: () => number
  arch?: () => string
  kvm?: () => boolean
  writeOut?: (text: string) => void
  writeErr?: (text: string) => void
  start?: Runtime['start']
  request?: Runtime['request']
  download?: Runtime['download']
  sleep?: Runtime['sleep']
  readLine?: Runtime['readLine']
  commandExists?: Runtime['commandExists']
}

export function createRuntime(overrides: RuntimeOverrides = {}): Runtime {
  const env = overrides.env ?? bunEnv()
  const paths = resolvePaths(env)
  const tty = overrides.tty ?? process.stdout.isTTY === true
  const columns = overrides.columns ?? Number(env['COLUMNS'] || process.stdout.columns || 80)
  return {
    env,
    paths,
    palette: paletteFor(tty && !env['NO_COLOR']),
    tty,
    canPrompt: overrides.canPrompt ?? hasControllingTty(),
    columns: Number.isFinite(columns) && columns > 0 ? columns : 80,
    uid: overrides.uid ?? (() => (typeof process.getuid === 'function' ? process.getuid() : 0)),
    arch: overrides.arch ?? (() => (process.arch === 'x64' ? 'x86_64' : process.arch)),
    kvm: overrides.kvm ?? (() => existsSync('/dev/kvm')),
    writeOut: overrides.writeOut ?? ((text) => process.stdout.write(text)),
    writeErr: overrides.writeErr ?? ((text) => process.stderr.write(text)),
    start: overrides.start ?? defaultStart,
    request: overrides.request ?? defaultRequest,
    download:
      overrides.download ??
      (async (url, dest) => {
        const response = await fetch(url)
        if (!response.ok)
          throw new CommandFailed(1, `Téléchargement impossible (${response.status}).`)
        await Bun.write(dest, response)
      }),
    sleep: overrides.sleep ?? ((ms) => Bun.sleep(ms)),
    readLine:
      overrides.readLine ??
      (async () => {
        if (!existsSync('/dev/tty')) return null
        const fd = openSync('/dev/tty', 'r')
        const chunks: Buffer[] = []
        const buffer = Buffer.alloc(256)
        try {
          for (;;) {
            const count = readSync(fd, buffer, 0, buffer.length, null)
            if (count <= 0) return null
            chunks.push(Buffer.from(buffer.subarray(0, count)))
            const text = Buffer.concat(chunks).toString('utf8')
            const end = text.indexOf('\n')
            if (end === -1) continue
            return text.slice(0, end).replace(/\r$/, '')
          }
        } finally {
          closeSync(fd)
        }
      }),
    commandExists: overrides.commandExists ?? ((name) => Bun.which(name) !== null),
    onInterrupt: undefined
  }
}

export async function runCommand(
  runtime: Runtime,
  command: string,
  args: string[],
  options?: SpawnOptions
): Promise<CommandResult> {
  return runtime.start(command, args, options).finished
}

export async function must(
  runtime: Runtime,
  command: string,
  args: string[],
  options?: SpawnOptions
): Promise<CommandResult> {
  const result = await runCommand(runtime, command, args, options)
  if (result.code !== 0) {
    throw new CommandFailed(result.code, `${result.stdout}${result.stderr}`)
  }
  return result
}

export function requireRoot(runtime: Runtime) {
  if (runtime.uid() !== 0) throw new Exit('Il faut être root.')
}

export function requireMachine(runtime: Runtime) {
  requireRoot(runtime)
  if (runtime.arch() !== 'x86_64') throw new Exit('Il faut une machine x86_64.')
  if (!runtime.kvm()) {
    throw new Exit('Il faut /dev/kvm. Une machine sans KVM ne peut pas lancer les micro-VM.')
  }
}

export async function withInterrupt<T>(
  runtime: Runtime,
  handler: () => void,
  action: () => Promise<T>
): Promise<T> {
  const previous = runtime.onInterrupt
  runtime.onInterrupt = handler
  try {
    return await action()
  } finally {
    runtime.onInterrupt = previous
  }
}

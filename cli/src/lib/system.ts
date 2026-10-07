import { randomBytes } from 'node:crypto'
import { closeSync, existsSync, openSync, readFileSync } from 'node:fs'
import { ReadStream } from 'node:tty'

export type Key = 'up' | 'down' | 'back' | 'enter' | 'quit' | 'other'

export function decodeKey(raw: string): Key {
  if (raw === '\u001b[A') return 'up'
  if (raw === '\u001b[B') return 'down'
  if (raw === '\u001b[D' || raw === '\u001b') return 'back'
  if (raw === '') return 'enter'
  if (raw === 'q' || raw === 'Q') return 'quit'
  return 'other'
}

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
  envFile: string
  pendingEnvFile: string
  previousEnvFile: string
  installLog: string
  assetSourceFile: string
  bin: string
  cmd: string
  so: string
  unitFile: string
  carlUnit: string
  caddyFile: string
  previousCaddyFile: string
  smolvmBin: string
  smolvmHome: string
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
  stdinTTY: boolean
  canPrompt: boolean
  columns: number
  uiActive: boolean
  uid: () => number
  arch: () => string
  kvm: () => boolean
  writeOut: (text: string) => void
  writeErr: (text: string) => void
  start: (command: string, args: string[], options?: SpawnOptions) => Child
  request: (url: string, options?: RequestOptions) => Promise<HttpResult>
  download: (url: string, dest: string) => Promise<void>
  sleep: (ms: number) => Promise<void>
  randomHex: (bytes: number) => string
  readKey: () => Promise<Key | null>
  readLine: () => Promise<string | null>
  readStdin: () => Promise<string>
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
  return {
    home: envOr(env, 'PIERRE_HOME_DIR', '/var/lib/pierre'),
    envFile,
    pendingEnvFile: envOr(env, 'PIERRE_PENDING_ENV_FILE', `${envFile}.pending`),
    previousEnvFile: envOr(env, 'PIERRE_PREVIOUS_ENV_FILE', `${envFile}.previous`),
    installLog: envOr(env, 'PIERRE_INSTALL_LOG', '/var/log/pierre-install.log'),
    assetSourceFile: envOr(env, 'PIERRE_ASSET_SOURCE_FILE', '/etc/pierre-install-source'),
    bin: envOr(env, 'PIERRE_BIN', '/usr/local/lib/pierre'),
    cmd: envOr(env, 'PIERRE_CMD', '/usr/local/bin/pierre'),
    so: envOr(env, 'PIERRE_SO', '/usr/local/lib/libonnxruntime.so.1'),
    unitFile: envOr(env, 'PIERRE_UNIT_FILE', '/etc/systemd/system/pierre.service'),
    carlUnit: envOr(env, 'PIERRE_CARL_UNIT', '/etc/systemd/system/carl.service'),
    caddyFile,
    previousCaddyFile: envOr(env, 'PIERRE_PREVIOUS_CADDY_FILE', `${caddyFile}.previous`),
    smolvmBin: envOr(env, 'PIERRE_SMOLVM_BIN', '/usr/local/bin/smolvm'),
    smolvmHome: envOr(env, 'PIERRE_SMOLVM_HOME', '/root/.smolvm')
  }
}

function hydrateAssetDir(env: Env, paths: Paths): Env {
  if (env['PIERRE_ASSET_DIR'] || !existsSync(paths.assetSourceFile)) return env
  const value = readFileSync(paths.assetSourceFile, 'utf8').split('\n')[0]?.trim() ?? ''
  if (!value) return env
  return { ...env, PIERRE_ASSET_DIR: value }
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
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const code = await proc.exited
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

const readRawKey = async (): Promise<string | null> => {
  if (!existsSync('/dev/tty')) return null
  const fd = openSync('/dev/tty', 'r')
  const stream = new ReadStream(fd)
  try {
    if (typeof stream.setRawMode === 'function') stream.setRawMode(true)
    const chunk = await new Promise<Buffer | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 120_000)
      stream.once('data', (data: Buffer) => {
        clearTimeout(timer)
        resolve(data)
      })
    })
    if (!chunk || chunk.length === 0) return null
    const text = chunk.toString('utf8')
    if (text === '\u0003') return 'q'
    if (text === '\r' || text === '\n') return ''
    return text
  } finally {
    if (typeof stream.setRawMode === 'function') stream.setRawMode(false)
    stream.destroy()
  }
}

export type RuntimeOverrides = {
  env?: Env
  tty?: boolean
  stdinTTY?: boolean
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
  randomHex?: Runtime['randomHex']
  readKey?: Runtime['readKey']
  readLine?: Runtime['readLine']
  readStdin?: Runtime['readStdin']
  commandExists?: Runtime['commandExists']
}

export function createRuntime(overrides: RuntimeOverrides = {}): Runtime {
  const baseEnv = overrides.env ?? bunEnv()
  const paths = resolvePaths(baseEnv)
  const env = hydrateAssetDir(baseEnv, paths)
  const tty = overrides.tty ?? process.stdout.isTTY === true
  const columns = overrides.columns ?? Number(env['COLUMNS'] || process.stdout.columns || 80)
  return {
    env,
    paths,
    palette: paletteFor(tty && !env['NO_COLOR']),
    tty,
    stdinTTY: overrides.stdinTTY ?? process.stdin.isTTY === true,
    canPrompt: overrides.canPrompt ?? hasControllingTty(),
    columns: Number.isFinite(columns) && columns > 0 ? columns : 80,
    uiActive: false,
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
    randomHex: overrides.randomHex ?? ((bytes) => randomBytes(bytes).toString('hex')),
    readKey:
      overrides.readKey ??
      (async () => {
        const raw = await readRawKey()
        return raw === null ? null : decodeKey(raw)
      }),
    readLine:
      overrides.readLine ??
      (async () => {
        if (!existsSync('/dev/tty')) return null
        const fd = openSync('/dev/tty', 'r')
        const stream = new ReadStream(fd)
        const line = await new Promise<string | null>((resolve) => {
          let buffer = ''
          const onData = (data: Buffer) => {
            buffer += data.toString('utf8')
            const end = buffer.indexOf('\n')
            if (end === -1) return
            stream.off('data', onData)
            resolve(buffer.slice(0, end).replace(/\r$/, ''))
          }
          stream.on('data', onData)
        })
        stream.destroy()
        return line
      }),
    readStdin: overrides.readStdin ?? (() => new Response(Bun.stdin.stream()).text()),
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

export async function waitForBody(
  runtime: Runtime,
  url: string,
  attempts: number,
  timeoutMs = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await runtime.request(url, { timeoutMs })
    if (response.status >= 200 && response.status < 300 && response.body.trim() === 'ok')
      return true
    if (attempt < attempts) await runtime.sleep(1000)
  }
  return false
}

export async function providerHttpCode(
  runtime: Runtime,
  type: string,
  base: string,
  key: string
): Promise<number> {
  const root = base.replace(/\/+$/, '')
  const response =
    type === 'anthropic'
      ? await runtime.request(`${root}/v1/models`, {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          timeoutMs: 10_000
        })
      : await runtime.request(`${root}/models`, {
          headers: { authorization: `Bearer ${key}` },
          timeoutMs: 10_000
        })
  return response.status
}

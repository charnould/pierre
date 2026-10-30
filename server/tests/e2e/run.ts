import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const SERVER_ROOT = resolve(import.meta.dir, '../..')

async function serverIsReady(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/up`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(1_000)
    })
    return response.ok
  } catch {
    return false
  }
}

const reservePort = (): number => {
  const reservation = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () => new Response()
  })
  const port = reservation.port
  reservation.stop(true)
  if (port === undefined) throw new Error('Bun did not allocate an E2E server port')
  return port
}

async function waitForServer(
  server: ReturnType<typeof Bun.spawn>,
  serverUrl: string
): Promise<void> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`E2E server exited during startup with code ${server.exitCode}`)
    }
    if (await serverIsReady(serverUrl)) return
    await Bun.sleep(250)
  }
  throw new Error('Timed out waiting for the E2E server')
}

const datastoreRoot = join(tmpdir(), `pierre-e2e-${Bun.randomUUIDv7()}`)
const port = reservePort()
const serverUrl = `http://127.0.0.1:${port}`
const env = {
  ...process.env,
  NODE_ENV: 'test',
  PIERRE_HOME: datastoreRoot,
  BUN_PORT: String(port),
  E2E_BASE_URL: serverUrl,
  SMOLVM_POOL_SIZE: '0',
  AUTH_SECRET: 'e2e-auth-secret-must-be-32-characters',
  AUTH_BEARER: 'e2e-bearer',
  AUTH_PASSWORD: 'e2e-password'
}

let server: ReturnType<typeof Bun.spawn> | null = null

try {
  await mkdir(datastoreRoot, { recursive: true })
  Bun.env['PIERRE_HOME'] = datastoreRoot
  const [{ setup }, { seedInstanceSetup }] = await Promise.all([
    import('../../utils/setup'),
    import('../seed-setup')
  ])
  await setup()
  await seedInstanceSetup()

  server = Bun.spawn({
    cmd: [process.execPath, 'run', 'serve.ts'],
    cwd: SERVER_ROOT,
    env,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  await waitForServer(server, serverUrl)

  const tests = Bun.spawn({
    cmd: [process.execPath, 'test', 'tests/e2e', '--timeout', '60000', '--max-concurrency', '1'],
    cwd: SERVER_ROOT,
    env,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  process.exitCode = await tests.exited
} finally {
  if (server) {
    server.kill()
    await server.exited
  }
  await rm(datastoreRoot, { recursive: true, force: true })
}

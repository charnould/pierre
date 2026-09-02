import { resolve } from 'node:path'

const SERVER_ROOT = resolve(import.meta.dir, '../..')
const SERVER_URL = 'http://localhost:3000'

async function serverIsReady(): Promise<boolean> {
  try {
    await fetch(SERVER_URL, { redirect: 'manual', signal: AbortSignal.timeout(1_000) })
    return true
  } catch {
    return false
  }
}

async function waitForServer(server: ReturnType<typeof Bun.spawn>): Promise<void> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`E2E server exited during startup with code ${server.exitCode}`)
    }
    if (await serverIsReady()) return
    await Bun.sleep(250)
  }
  throw new Error('Timed out waiting for the E2E server')
}

let server: ReturnType<typeof Bun.spawn> | null = null

try {
  if (!(await serverIsReady())) {
    server = Bun.spawn({
      cmd: [process.execPath, '--env-file=../.env.production', 'run', 'start.ts'],
      cwd: SERVER_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        SMOLVM_POOL_SIZE: '0'
      },
      stdout: 'inherit',
      stderr: 'inherit'
    })
    await waitForServer(server)
  }

  const tests = Bun.spawn({
    cmd: [
      process.execPath,
      'test',
      'tests/e2e',
      '--timeout',
      '60000',
      '--env-file=../.env.production',
      '--preload',
      './utils/setup.ts'
    ],
    cwd: SERVER_ROOT,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  process.exitCode = await tests.exited
} finally {
  if (server) {
    server.kill()
    await server.exited
  }
}

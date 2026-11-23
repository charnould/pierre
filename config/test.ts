import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')
const EMPTY_CONFIG = join(ROOT, 'config/root-tests/child.bunfig.toml')

type Suite = {
  cwd: string
  config?: string
  args: readonly string[]
}

const SUITES = {
  config: {
    cwd: join(ROOT, 'config'),
    config: EMPTY_CONFIG,
    args: ['test', 'checks', 'release.test.ts']
  },
  shared: { cwd: join(ROOT, 'shared'), config: EMPTY_CONFIG, args: ['test'] },
  cli: { cwd: join(ROOT, 'cli'), config: EMPTY_CONFIG, args: ['test', 'tests'] },
  docs: { cwd: join(ROOT, 'docs'), config: EMPTY_CONFIG, args: ['test'] },
  server: {
    cwd: join(ROOT, 'server'),
    config: join(ROOT, 'server/bunfig.toml'),
    args: ['test', '--max-concurrency', '1', 'unit']
  },
  desktop: {
    cwd: join(ROOT, 'desktop'),
    config: join(ROOT, 'desktop/bunfig.toml'),
    args: ['test']
  },
  e2e: { cwd: ROOT, args: ['server/tests/e2e/run.ts'] }
} as const satisfies Record<string, Suite>

type SuiteName = keyof typeof SUITES

const GROUPS = {
  core: ['config', 'shared', 'cli', 'docs'],
  server: ['server'],
  desktop: ['desktop'],
  e2e: ['e2e'],
  all: ['config', 'shared', 'cli', 'docs', 'server', 'desktop', 'e2e']
} as const satisfies Record<string, readonly SuiteName[]>

export async function runSuites(names: readonly SuiteName[]): Promise<void> {
  for (const name of names) {
    const suite: Suite = SUITES[name]
    console.log(`\n=== ${name} ===`)
    const cmd = suite.config
      ? [process.execPath, `--config=${suite.config}`, ...suite.args]
      : [process.execPath, ...suite.args]
    const child = Bun.spawn({
      cmd,
      cwd: suite.cwd,
      env: { ...Bun.env, TZ: 'Europe/Paris' },
      stdout: 'inherit',
      stderr: 'inherit'
    })
    const exitCode = await child.exited
    if (exitCode !== 0) throw new Error(`${name} suite failed with exit code ${exitCode}`)
  }
}

if (import.meta.main) {
  const group = process.argv[2]
  if (!group || !(group in GROUPS)) {
    console.error(`Usage: bun config/test.ts <${Object.keys(GROUPS).join('|')}>`)
    process.exit(1)
  }
  try {
    await runSuites(GROUPS[group as keyof typeof GROUPS])
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

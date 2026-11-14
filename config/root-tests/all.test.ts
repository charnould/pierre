import { expect, test } from 'bun:test'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '../..')
const EMPTY_CONFIG = join(import.meta.dir, 'child.bunfig.toml')

const suites = [
  {
    name: 'shared contracts',
    cwd: join(ROOT, 'shared'),
    config: EMPTY_CONFIG,
    args: ['test']
  },
  {
    name: 'CLI',
    cwd: join(ROOT, 'cli'),
    config: EMPTY_CONFIG,
    args: ['test', 'tests']
  },
  {
    name: 'server',
    cwd: join(ROOT, 'server'),
    config: join(ROOT, 'server/bunfig.toml'),
    args: ['test', '--max-concurrency', '1', 'unit']
  },
  {
    name: 'desktop',
    cwd: join(ROOT, 'desktop'),
    config: join(ROOT, 'desktop/bunfig.toml'),
    args: ['test']
  },
  {
    name: 'docs',
    cwd: join(ROOT, 'docs'),
    config: EMPTY_CONFIG,
    args: ['test']
  }
] as const

test('all repository suites pass', async () => {
  for (const suite of suites) {
    console.log(`\n=== ${suite.name} ===`)
    const child = Bun.spawn({
      cmd: [process.execPath, `--config=${suite.config}`, ...suite.args],
      cwd: suite.cwd,
      env: { ...Bun.env, TZ: 'Europe/Paris' },
      stdout: 'inherit',
      stderr: 'inherit'
    })
    const exitCode = await child.exited
    expect(exitCode, suite.name).toBe(0)
  }
}, 180_000)

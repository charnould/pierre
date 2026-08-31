import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { cpus, totalmem } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { measureBundles } from './bundle'
import { measureDocxInspection } from './docx'
import { measureRepayment10k } from './repayment'
import { renderMarkdownReport, type PerformanceRun } from './report'
import { measureElectronRuntime } from './runtime'

const desktopRoot = resolve(dirname(import.meta.path), '..')
const outputRoot = join(desktopRoot, 'perf', 'out')
const runsRoot = join(outputRoot, 'runs')
const reportsRoot = join(outputRoot, 'reports')
const baselinesRoot = join(desktopRoot, 'perf', 'baselines')

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const commit = (): string => {
  const result = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD'], {
    cwd: join(desktopRoot, '..'),
    stdout: 'pipe',
    stderr: 'ignore'
  })
  return result.exitCode === 0 ? result.stdout.toString().trim() : 'unknown'
}

const createRun = async (label: string, includeRuntime: boolean): Promise<PerformanceRun> => {
  const cpuList = cpus()
  return {
    schemaVersion: 1,
    label,
    createdAt: new Date().toISOString(),
    commit: commit(),
    profile: {
      platform: process.platform,
      arch: process.arch,
      cpu: cpuList[0]?.model ?? 'unknown',
      cpuCount: cpuList.length,
      totalMemoryBytes: totalmem(),
      mode: 'build'
    },
    bundle: await measureBundles(desktopRoot),
    repayment10k: measureRepayment10k(),
    docx: await measureDocxInspection(),
    ...(includeRuntime ? { runtime: await measureElectronRuntime(desktopRoot) } : {})
  }
}

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

const saveRun = async (run: PerformanceRun, baseline: boolean): Promise<string> => {
  const path = baseline
    ? join(baselinesRoot, `${run.label}.json`)
    : join(runsRoot, `${timestamp()}-${run.label}.json`)
  await writeJson(path, run)
  return path
}

const readRun = async (path: string): Promise<PerformanceRun> =>
  Bun.file(path).json() as Promise<PerformanceRun>

const runFiles = async (): Promise<string[]> => {
  const files = await readdir(runsRoot).catch(() => [])
  return files
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => join(runsRoot, file))
}

const resolveRun = async (labelOrPath: string): Promise<string> => {
  if (await Bun.file(labelOrPath).exists()) return resolve(labelOrPath)
  const baselinePath = join(baselinesRoot, `${labelOrPath}.json`)
  if (await Bun.file(baselinePath).exists()) return baselinePath
  const files = await runFiles()
  const match = [...files].reverse().find((file) => file.endsWith(`-${labelOrPath}.json`))
  if (!match) throw new Error(`Performance run not found: ${labelOrPath}`)
  return match
}

const measure = async (baseline: boolean, includeRuntime = false): Promise<void> => {
  const label = option('--label') ?? (baseline ? 'before' : 'run')
  const run = await createRun(label, includeRuntime)
  const path = await saveRun(run, baseline)
  console.log(path)
}

const check = async (): Promise<void> => {
  const budgets = (await Bun.file(join(desktopRoot, 'perf', 'budgets.json')).json()) as {
    rendererColdStartRawBytes: number
    rendererColdStartGzipBytes: number
    rendererTotalJsRawBytes: number
  }
  const bundle = await measureBundles(desktopRoot)
  const failures = [
    ['rendererColdStartRawBytes', bundle.rendererColdStart.rawBytes],
    ['rendererColdStartGzipBytes', bundle.rendererColdStart.gzipBytes],
    ['rendererTotalJsRawBytes', bundle.rendererTotalJs.rawBytes]
  ]
    .filter(([name, value]) => value > budgets[name as keyof typeof budgets])
    .map(([name, value]) => `${name}: ${value} > ${budgets[name as keyof typeof budgets]}`)
  if (failures.length > 0) throw new Error(`Bundle budgets exceeded:\n${failures.join('\n')}`)
  console.log('Bundle budgets passed')
}

const report = async (): Promise<void> => {
  let beforePath: string
  let afterPath: string
  if (process.argv.includes('--latest')) {
    const files = await runFiles()
    if (files.length < 2) throw new Error('At least two runs are required for --latest')
    ;[beforePath, afterPath] = files.slice(-2) as [string, string]
  } else {
    beforePath = await resolveRun(option('--baseline') ?? 'before')
    afterPath = await resolveRun(option('--candidate') ?? 'after')
  }
  const before = await readRun(beforePath)
  const after = await readRun(afterPath)
  const markdown = renderMarkdownReport(before, after)
  const name = `${timestamp()}-${before.label}-vs-${after.label}`
  await mkdir(reportsRoot, { recursive: true })
  const markdownPath = join(reportsRoot, `${name}.md`)
  await writeFile(markdownPath, markdown)
  await writeJson(join(reportsRoot, `${name}.json`), { before, after })
  console.log(markdownPath)
}

const command = process.argv[2]
switch (command) {
  case 'measure':
    await measure(false)
    break
  case 'bench':
    await measure(false, true)
    break
  case 'baseline':
    await measure(true)
    break
  case 'check':
    await check()
    break
  case 'report':
    await report()
    break
  default:
    throw new Error(`Unknown perf command: ${command ?? '<missing>'}`)
}

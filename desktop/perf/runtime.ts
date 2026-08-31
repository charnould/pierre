import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { ElectronRuntimeMetrics } from '../electron/perf-benchmark'

export type { ElectronRuntimeMetrics } from '../electron/perf-benchmark'

const runElectron = async (
  desktopRoot: string,
  iteration: number
): Promise<ElectronRuntimeMetrics> => {
  const outputPath = join(desktopRoot, 'perf', 'out', `runtime-${iteration}.json`)
  await mkdir(dirname(outputPath), { recursive: true })
  const processHandle = Bun.spawn(['bunx', 'electron', '.'], {
    cwd: desktopRoot,
    env: {
      ...process.env,
      PIERRE_PERF_OUTPUT: outputPath
    },
    stdout: 'ignore',
    stderr: 'pipe'
  })
  const timeout = setTimeout(() => processHandle.kill(), 20_000)
  const exitCode = await processHandle.exited
  clearTimeout(timeout)
  if (exitCode !== 0) {
    const error = await new Response(processHandle.stderr).text()
    throw new Error(`Electron benchmark failed (${exitCode}): ${error.trim()}`)
  }
  if (!(await Bun.file(outputPath).exists())) {
    throw new Error('Electron benchmark did not produce runtime metrics')
  }
  return Bun.file(outputPath).json() as Promise<ElectronRuntimeMetrics>
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const nullableMedian = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value != null)
  return present.length === 0 ? null : median(present)
}

export async function measureElectronRuntime(
  desktopRoot: string
): Promise<ElectronRuntimeMetrics | undefined> {
  if (process.env['CI'] === 'true' && process.platform !== 'darwin') return undefined
  const samples: ElectronRuntimeMetrics[] = []
  for (let iteration = 0; iteration < 3; iteration += 1) {
    samples.push(await runElectron(desktopRoot, iteration))
  }
  return {
    readyToShowMs: median(samples.map((sample) => sample.readyToShowMs)),
    domReadyMs: nullableMedian(samples.map((sample) => sample.domReadyMs)),
    sampledAtMs: median(samples.map((sample) => sample.sampledAtMs)),
    mainWorkingSetBytes: median(samples.map((sample) => sample.mainWorkingSetBytes)),
    rendererWorkingSetBytes: median(samples.map((sample) => sample.rendererWorkingSetBytes)),
    mainCpuPercent: median(samples.map((sample) => sample.mainCpuPercent)),
    rendererCpuPercent: median(samples.map((sample) => sample.rendererCpuPercent)),
    rendererDomNodes: nullableMedian(samples.map((sample) => sample.rendererDomNodes)),
    rendererHeapBytes: nullableMedian(samples.map((sample) => sample.rendererHeapBytes))
  }
}

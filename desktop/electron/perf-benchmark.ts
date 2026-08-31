import { writeFile } from 'node:fs/promises'

import { app, type BrowserWindow } from 'electron'

export type ElectronRuntimeMetrics = {
  readyToShowMs: number
  domReadyMs: number | null
  sampledAtMs: number
  mainWorkingSetBytes: number
  rendererWorkingSetBytes: number
  mainCpuPercent: number
  rendererCpuPercent: number
  rendererDomNodes: number | null
  rendererHeapBytes: number | null
}

export function attachPerformanceBenchmark(window: BrowserWindow): void {
  const outputPath = process.env['PIERRE_PERF_OUTPUT']
  if (!outputPath) return

  let domReadyMs: number | null = null
  window.webContents.once('dom-ready', () => {
    domReadyMs = performance.now()
  })

  window.once('ready-to-show', () => {
    const readyToShowMs = performance.now()
    window.show()
    setTimeout(() => {
      void (async () => {
        const sampledAtMs = performance.now()
        const metrics = app.getAppMetrics()
        const main = metrics.find((metric) => metric.type === 'Browser')
        const renderer = metrics.find(
          (metric) => metric.pid === window.webContents.getOSProcessId()
        )
        const rendererPage = await window.webContents
          .executeJavaScript(
            `({
              domNodes: document.getElementsByTagName('*').length,
              heapBytes: performance.memory?.usedJSHeapSize ?? null
            })`,
            true
          )
          .catch(() => null)
        const result: ElectronRuntimeMetrics = {
          readyToShowMs,
          domReadyMs,
          sampledAtMs,
          mainWorkingSetBytes: (main?.memory.workingSetSize ?? 0) * 1024,
          rendererWorkingSetBytes: (renderer?.memory.workingSetSize ?? 0) * 1024,
          mainCpuPercent: main?.cpu.percentCPUUsage ?? 0,
          rendererCpuPercent: renderer?.cpu.percentCPUUsage ?? 0,
          rendererDomNodes: rendererPage?.domNodes ?? null,
          rendererHeapBytes: rendererPage?.heapBytes ?? null
        }
        await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)
        app.exit(0)
      })()
    }, 1_500)
  })
}

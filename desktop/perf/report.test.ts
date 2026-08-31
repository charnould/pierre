import { describe, expect, test } from 'bun:test'

import type { BundleMetrics } from './bundle'
import { compareRuns, renderMarkdownReport, type PerformanceRun } from './report'

const bundle = (coldStartRawBytes: number): BundleMetrics => ({
  main: { file: 'main.js', rawBytes: 100, gzipBytes: 50 },
  preload: { file: 'preload.js', rawBytes: 10, gzipBytes: 5 },
  rendererEntry: { file: 'index.js', rawBytes: coldStartRawBytes, gzipBytes: 40 },
  rendererColdStart: {
    rawBytes: coldStartRawBytes,
    gzipBytes: 40,
    assets: []
  },
  rendererTotalJs: {
    rawBytes: coldStartRawBytes + 50,
    gzipBytes: 60,
    assetCount: 2
  }
})

const run = (label: string, coldStartRawBytes: number): PerformanceRun => ({
  schemaVersion: 1,
  label,
  createdAt: '2026-08-31T00:00:00.000Z',
  commit: label,
  profile: {
    platform: 'win32',
    arch: 'x64',
    cpu: 'test',
    cpuCount: 4,
    totalMemoryBytes: 8_000_000_000,
    mode: 'build'
  },
  bundle: bundle(coldStartRawBytes)
})

describe('performance report', () => {
  test('computes signed byte and percentage deltas', () => {
    const comparison = compareRuns(run('before', 1_000), run('after', 750))
    expect(comparison.find((row) => row.metric === 'Renderer cold-start raw')).toMatchObject({
      before: 1_000,
      after: 750,
      delta: -250,
      deltaPercent: -25
    })
  })

  test('rejects incompatible profiles', () => {
    const after = run('after', 750)
    after.profile.platform = 'darwin'
    expect(() => compareRuns(run('before', 1_000), after)).toThrow('incompatible profiles')
  })

  test('renders a standalone markdown summary', () => {
    const report = renderMarkdownReport(run('before', 1_000), run('after', 750))
    expect(report).toContain('# Desktop performance report')
    expect(report).toContain('Renderer cold-start raw')
    expect(report).toContain('-25.0%')
  })
})

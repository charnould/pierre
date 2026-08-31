import type { BundleMetrics } from './bundle'
import type { DocxMetrics } from './docx'
import type { Repayment10kMetrics } from './repayment'
import type { ElectronRuntimeMetrics } from './runtime'

export type PerformanceRun = {
  schemaVersion: 1
  label: string
  createdAt: string
  commit: string
  profile: {
    platform: string
    arch: string
    cpu: string
    cpuCount: number
    totalMemoryBytes: number
    mode: 'build'
  }
  bundle: BundleMetrics
  repayment10k?: Repayment10kMetrics
  docx?: DocxMetrics
  runtime?: ElectronRuntimeMetrics
}

type ComparisonRow = {
  metric: string
  before: number
  after: number
  delta: number
  deltaPercent: number
}

const rows = (before: PerformanceRun, after: PerformanceRun): ComparisonRow[] => {
  const metrics = [
    ['Main JS raw', before.bundle.main.rawBytes, after.bundle.main.rawBytes],
    [
      'Renderer entry raw',
      before.bundle.rendererEntry.rawBytes,
      after.bundle.rendererEntry.rawBytes
    ],
    [
      'Renderer cold-start raw',
      before.bundle.rendererColdStart.rawBytes,
      after.bundle.rendererColdStart.rawBytes
    ],
    [
      'Renderer cold-start gzip',
      before.bundle.rendererColdStart.gzipBytes,
      after.bundle.rendererColdStart.gzipBytes
    ],
    [
      'Renderer total JS raw',
      before.bundle.rendererTotalJs.rawBytes,
      after.bundle.rendererTotalJs.rawBytes
    ]
  ] as const

  return metrics.map(([metric, beforeValue, afterValue]) => ({
    metric,
    before: beforeValue,
    after: afterValue,
    delta: afterValue - beforeValue,
    deltaPercent: beforeValue === 0 ? 0 : ((afterValue - beforeValue) / beforeValue) * 100
  }))
}

const formatBytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`

export function compareRuns(before: PerformanceRun, after: PerformanceRun): ComparisonRow[] {
  if (before.schemaVersion !== after.schemaVersion) {
    throw new Error('Cannot compare runs with different schema versions')
  }
  if (
    before.profile.platform !== after.profile.platform ||
    before.profile.arch !== after.profile.arch ||
    before.profile.mode !== after.profile.mode
  ) {
    throw new Error('Cannot compare runs from incompatible profiles')
  }
  return rows(before, after)
}

export function renderMarkdownReport(before: PerformanceRun, after: PerformanceRun): string {
  const comparison = compareRuns(before, after)
  const regressions = comparison.filter((row) => row.delta > 0)
  const improvements = comparison.filter((row) => row.delta < 0)

  const repayment = after.repayment10k
    ? [
        '',
        '## Repayment board (10,000 cases)',
        '',
        '| Operation | Median |',
        '| --- | ---: |',
        `| Map API rows | ${after.repayment10k.mapMs.toFixed(2)} ms |`,
        `| Group buckets | ${after.repayment10k.groupMs.toFixed(2)} ms |`,
        `| Apply filter | ${after.repayment10k.filterMs.toFixed(2)} ms |`,
        `| Build one facet | ${after.repayment10k.facetMs.toFixed(2)} ms |`
      ]
    : []
  const docx = after.docx
    ? [
        '',
        '## DOCX inspection',
        '',
        `Cold: ${after.docx.coldMs.toFixed(2)} ms · warm median: ${after.docx.warmMedianMs.toFixed(2)} ms · sample: ${formatBytes(after.docx.bytes)}`
      ]
    : []
  const runtime = after.runtime
    ? [
        '',
        '## Electron cold shell',
        '',
        `Ready to show: ${after.runtime.readyToShowMs.toFixed(0)} ms · sampled: ${after.runtime.sampledAtMs.toFixed(0)} ms`,
        `Main working set: ${formatBytes(after.runtime.mainWorkingSetBytes)} · renderer working set: ${formatBytes(after.runtime.rendererWorkingSetBytes)}`,
        `Renderer heap: ${after.runtime.rendererHeapBytes == null ? 'unavailable' : formatBytes(after.runtime.rendererHeapBytes)} · DOM nodes: ${after.runtime.rendererDomNodes ?? 'unavailable'}`
      ]
    : []

  return [
    '# Desktop performance report',
    '',
    `Before: \`${before.label}\` (${before.commit})`,
    `After: \`${after.label}\` (${after.commit})`,
    `Profile: ${after.profile.platform}/${after.profile.arch}, ${after.profile.cpuCount} CPUs`,
    '',
    '| Metric | Before | After | Delta | Change |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...comparison.map(
      (row) =>
        `| ${row.metric} | ${formatBytes(row.before)} | ${formatBytes(row.after)} | ${formatBytes(row.delta)} | ${row.deltaPercent.toFixed(1)}% |`
    ),
    '',
    `Summary: ${improvements.length} improved, ${regressions.length} regressed, ${comparison.length - improvements.length - regressions.length} stable.`,
    ...repayment,
    ...docx,
    ...runtime,
    ''
  ].join('\n')
}

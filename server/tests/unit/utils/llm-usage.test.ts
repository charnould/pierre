import { describe, expect, it } from 'bun:test'

import { type MeasuredRun, projectTokens, summarizeUsage } from '../../../../shared/llm-usage'
import { deltaSessionCounters, parseSessionCounters } from '../../../utils/llm-runs'

const zone = 'Europe/Paris'
const now = new Date('2024-03-15T12:00:00.000Z')

describe('session counters', () => {
  it('keeps only the consumption since the previous snapshot', () => {
    const before = parseSessionCounters({
      tokens: { input: 100, output: 20, cacheRead: 40, cacheWrite: 5, total: 165 },
      cost: 0.2
    })
    const after = parseSessionCounters({
      tokens: { input: 130, output: 35, cacheRead: 40, cacheWrite: 8, total: 213 },
      cost: 0.45,
      contextUsage: { tokens: 90, contextWindow: 200_000, percent: 0.045 }
    })
    expect(before && after && deltaSessionCounters(before, after)).toEqual({
      input: 30,
      output: 15,
      cacheRead: 0,
      cacheWrite: 3,
      total: 48,
      cost: 0.25,
      contextUsage: { tokens: 90, contextWindow: 200_000, percent: 0.045 }
    })
  })

  it('does not invent tokens when a snapshot is incomplete', () => {
    expect(parseSessionCounters({ tokens: { input: 1 } })).toBeNull()
    expect(parseSessionCounters({})).toBeNull()
  })
})

describe('usage projections', () => {
  it('projects the current month and year from the first measured run', () => {
    const runs: MeasuredRun[] = [
      { startedAt: '2024-03-10T10:00:00.000Z', operation: 'chat', tokensTotal: 1000 },
      { startedAt: '2024-03-12T10:00:00.000Z', operation: 'workflow', tokensTotal: 500 },
      { startedAt: '2024-02-01T10:00:00.000Z', operation: 'automation', tokensTotal: 9000 },
      { startedAt: '2024-03-14T10:00:00.000Z', operation: 'chat', tokensTotal: null }
    ]
    const month = projectTokens(now, zone, runs, 'month')
    const year = projectTokens(now, zone, runs, 'year')
    expect(month.observedFrom).toBe('2024-03-10T10:00:00.000Z')
    expect(month.tokens).toBeGreaterThan(1500)
    expect(year.observedFrom).toBe('2024-02-01T10:00:00.000Z')
    expect(year.tokens).toBeGreaterThan(10500)
  })

  it('returns an unavailable projection when nothing was measured', () => {
    expect(projectTokens(now, zone, [], 'month')).toEqual({ tokens: null, observedFrom: null })
    const summary = summarizeUsage(now, zone, '7d', [
      { startedAt: '2024-03-14T10:00:00.000Z', operation: 'chat', tokensTotal: null }
    ])
    expect(summary.monthTokens).toBeNull()
    expect(summary.monthProjection).toBeNull()
    expect(summary.daily.some((point) => point.tokens === null)).toBe(true)
  })

  it('keeps a real zero when the selected period has no treatment', () => {
    const summary = summarizeUsage(now, zone, '7d', [])
    expect(summary.monthTokens).toBe(0)
    expect(summary.byOperation.map((item) => item.tokens)).toEqual([0, 0, 0])
  })
})

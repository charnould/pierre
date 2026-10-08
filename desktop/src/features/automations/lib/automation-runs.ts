import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import type { Activity } from '@/shared/types/activites'
import { activityPayload, activityText } from '@/shared/types/activites'

import {
  type Automation,
  automationMaxReports,
  isReportAutomation,
  type ReportAutomation,
  type ReportRun
} from './automation-types'

function trimRunsToLimit<T extends { date: string }>(runs: T[], max: number): T[] {
  return [...runs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, max)
}

export type AutomationRunMenuEntry = {
  id: number | string
  date: string
  label: string
  subtitle: string
  target: ReaderTarget
}

function formatRunMenuDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function activityRowToReaderTarget(row: Activity, automation: Automation): ReaderTarget {
  const payload = activityPayload(row.type, row.contenu)
  const title = typeof payload['title'] === 'string' ? payload['title'] : automation.name
  const content = activityText(row.type, row.contenu) || undefined

  return {
    kind: 'automation',
    activityId: row.id,
    automationId: automation.id,
    title,
    content,
    date: row.createdAt
  }
}

function mockRunToReaderTarget(run: ReportRun, automation: ReportAutomation): ReaderTarget {
  return {
    kind: 'automation',
    activityId: run.id,
    automationId: automation.id,
    title: automation.name,
    content: run.report,
    date: run.date
  }
}

function activityRunSubtitle(row: Activity, automation: Automation): string {
  if (isReportAutomation(automation)) return 'Rapport'

  const summary = activityPayload(row.type, row.contenu)['summary']
  if (summary && typeof summary === 'object' && summary !== null) {
    const generated = (summary as { generated?: unknown }).generated
    const total = (summary as { total?: unknown }).total
    if (typeof generated === 'number' && typeof total === 'number') {
      return `${generated} brouillons générés sur ${total}`
    }
  }

  return 'Réponses'
}

export function buildAutomationRunEntries(
  automation: Automation,
  activityRows: Activity[],
  limit: number
): AutomationRunMenuEntry[] {
  if (activityRows.length > 0) {
    return [...activityRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        date: row.createdAt,
        label: formatRunMenuDate(row.createdAt),
        subtitle: activityRunSubtitle(row, automation),
        target: activityRowToReaderTarget(row, automation)
      }))
  }

  const runs = trimRunsToLimit(automation.runs, limit)
  return runs.map((run) => ({
    id: run.id,
    date: run.date,
    label: formatRunMenuDate(run.date),
    subtitle: 'Rapport',
    target: mockRunToReaderTarget(run, automation)
  }))
}

export function automationRunLimit(automation: Automation): number {
  return automationMaxReports(automation)
}

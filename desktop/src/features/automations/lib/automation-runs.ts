import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import type { Activite } from '@/shared/types/activites'
import { activity_payload } from '@/shared/types/activites'

import {
  automationMaxReports,
  isReportAutomation,
  type Automation,
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

function activityRowToReaderTarget(row: Activite, automation: Automation): ReaderTarget {
  const payload = activity_payload(row.type, row.contenu)
  const titre = typeof payload['titre'] === 'string' ? payload['titre'] : automation.name
  const contenu = typeof payload['contenu'] === 'string' ? payload['contenu'] : undefined

  return {
    kind: 'automation',
    activityId: row.id,
    automationId: automation.id,
    title: titre,
    content: contenu,
    date: row.date_creation
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

function activityRunSubtitle(row: Activite, automation: Automation): string {
  if (isReportAutomation(automation)) return 'Rapport'

  const summary = activity_payload(row.type, row.contenu)['summary']
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
  activityRows: Activite[],
  limit: number
): AutomationRunMenuEntry[] {
  if (activityRows.length > 0) {
    return [...activityRows]
      .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        date: row.date_creation,
        label: formatRunMenuDate(row.date_creation),
        subtitle: activityRunSubtitle(row, automation),
        target: activityRowToReaderTarget(row, automation)
      }))
  }

  if (isReportAutomation(automation)) {
    const runs = trimRunsToLimit(automation.runs, limit)
    return runs.map((run) => ({
      id: run.id,
      date: run.date,
      label: formatRunMenuDate(run.date),
      subtitle: 'Rapport',
      target: mockRunToReaderTarget(run, automation)
    }))
  }

  return []
}

export function automationRunLimit(automation: Automation): number {
  if (isReportAutomation(automation)) return automationMaxReports(automation)
  return 0
}

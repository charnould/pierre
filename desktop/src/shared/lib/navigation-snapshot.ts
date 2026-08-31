import type { AboutSubject } from '@/features/tickets/lib/knowledge-skills'
import type { WorkflowStep } from '@/features/workflow/hooks/useWorkflowPanel'
import type { Tab } from '@/shared/lib/tabs'

export type ActivityTarget =
  | { view: 'repayment'; tenantId: string; idClient?: string | null; activityId?: number }
  | { view: 'tickets'; id_reclamation: string; activityId?: number }
  | { view: 'automations'; automationId: string; activityId?: number }
  | { view: 'updates'; slug: string; title: string; date: string }

export type AboutNavigationState = {
  step: WorkflowStep
  aboutSubject: AboutSubject
  entityId: string
  yearFrom: string
  yearTo: string
  context: string
}

export type NavigationSnapshot = {
  tab: Tab
  activityTarget?: ActivityTarget
  about?: AboutNavigationState
}

function aboutEqual(a: AboutNavigationState, b: AboutNavigationState): boolean {
  return (
    a.step === b.step &&
    a.aboutSubject === b.aboutSubject &&
    a.entityId === b.entityId &&
    a.yearFrom === b.yearFrom &&
    a.yearTo === b.yearTo &&
    a.context === b.context
  )
}

function activityTargetEqual(
  a: ActivityTarget | undefined,
  b: ActivityTarget | undefined
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.view !== b.view) return false
  if (a.view === 'repayment' && b.view === 'repayment') {
    return (
      a.tenantId === b.tenantId &&
      a.activityId === b.activityId &&
      (a.idClient ?? null) === (b.idClient ?? null)
    )
  }
  if (a.view === 'tickets' && b.view === 'tickets') {
    return a.id_reclamation === b.id_reclamation && a.activityId === b.activityId
  }
  if (a.view === 'automations' && b.view === 'automations') {
    return a.automationId === b.automationId && a.activityId === b.activityId
  }
  if (a.view === 'updates' && b.view === 'updates') {
    return a.slug === b.slug
  }
  return false
}

export function snapshotsEqual(a: NavigationSnapshot, b: NavigationSnapshot): boolean {
  if (a.tab !== b.tab) return false
  if (!activityTargetEqual(a.activityTarget, b.activityTarget)) return false
  if (a.about || b.about) {
    if (!a.about || !b.about) return false
    if (!aboutEqual(a.about, b.about)) return false
  }
  return true
}

export function mergeSnapshot(
  base: NavigationSnapshot,
  partial: Partial<NavigationSnapshot>
): NavigationSnapshot {
  const tab = partial.tab ?? base.tab
  const result: NavigationSnapshot = { tab }

  if (partial.activityTarget !== undefined) {
    result.activityTarget = partial.activityTarget
  } else if (tab === base.tab) {
    result.activityTarget = base.activityTarget
  }

  if (tab === 'about') {
    result.about = partial.about ?? (base.tab === 'about' ? base.about : undefined)
  }

  return result
}

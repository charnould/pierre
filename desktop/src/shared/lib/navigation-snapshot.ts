import type { AboutSubject, TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import type { DraftRevision } from '@/features/tickets/lib/ticket-draft-revision'
import type { WorkflowStep } from '@/features/workflow/hooks/useWorkflowPanel'
import type { Tab } from '@/shared/lib/tabs'

export type TicketsNavigationState = {
  step: WorkflowStep
  ticketNumber: string
  tenantNumber: string
  message: string
  context: string
  ticketFormat: TicketSkillKey
  draftRevision?: DraftRevision
}

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
  tickets?: TicketsNavigationState
  about?: AboutNavigationState
}

export function defaultTicketsTableState(): TicketsNavigationState {
  return {
    step: 'form',
    ticketNumber: '',
    tenantNumber: '',
    message: '',
    context: '',
    ticketFormat: 'ticketReplyEmail'
  }
}

function ticketsEqual(a: TicketsNavigationState, b: TicketsNavigationState): boolean {
  return (
    a.step === b.step &&
    a.ticketNumber === b.ticketNumber &&
    a.tenantNumber === b.tenantNumber &&
    a.message === b.message &&
    a.context === b.context &&
    a.ticketFormat === b.ticketFormat &&
    a.draftRevision === b.draftRevision
  )
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

export function snapshotsEqual(a: NavigationSnapshot, b: NavigationSnapshot): boolean {
  if (a.tab !== b.tab) return false
  if (a.tickets || b.tickets) {
    if (!a.tickets || !b.tickets) return false
    if (!ticketsEqual(a.tickets, b.tickets)) return false
  }
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

  if (tab === 'tickets') {
    result.tickets = partial.tickets ?? (base.tab === 'tickets' ? base.tickets : undefined)
  }

  if (tab === 'about') {
    result.about = partial.about ?? (base.tab === 'about' ? base.about : undefined)
  }

  return result
}

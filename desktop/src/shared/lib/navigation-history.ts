import { snapshotsEqual, type NavigationSnapshot } from '@/shared/lib/navigation-snapshot'
import type { Tab } from '@/shared/lib/tabs'

export type NavigationStack = {
  entries: NavigationSnapshot[]
  index: number
}

export function createNavigationStack(initial: NavigationSnapshot): NavigationStack {
  return { entries: [initial], index: 0 }
}

export function pushNavigationEntry(
  stack: NavigationStack,
  next: NavigationSnapshot
): NavigationStack {
  const current = stack.entries[stack.index]
  if (current && snapshotsEqual(current, next)) {
    return stack
  }

  const entries = [...stack.entries.slice(0, stack.index + 1), next]
  return { entries, index: entries.length - 1 }
}

export function replaceNavigationEntry(
  stack: NavigationStack,
  next: NavigationSnapshot
): NavigationStack {
  return { entries: [next], index: 0 }
}

export function goBackInStack(stack: NavigationStack): NavigationStack | null {
  if (stack.index <= 0) return null
  return { ...stack, index: stack.index - 1 }
}

export function goForwardInStack(stack: NavigationStack): NavigationStack | null {
  if (stack.index >= stack.entries.length - 1) return null
  return { ...stack, index: stack.index + 1 }
}

export function canGoBackInTab(stack: NavigationStack, tab: Tab): boolean {
  if (stack.index <= 0) return false
  return stack.entries[stack.index - 1]?.tab === tab
}

export function canGoForwardInTab(stack: NavigationStack, tab: Tab): boolean {
  if (stack.index >= stack.entries.length - 1) return false
  return stack.entries[stack.index + 1]?.tab === tab
}

function isTicketsFormEntry(entry: NavigationSnapshot | undefined): boolean {
  return entry?.tab === 'tickets' && entry.tickets?.step === 'form'
}

function isTicketsOutputEntry(entry: NavigationSnapshot | undefined): boolean {
  return entry?.tab === 'tickets' && entry.tickets?.step === 'output'
}

export function canGoBackInTicketsStack(stack: NavigationStack): boolean {
  if (stack.index <= 0) return false
  const current = stack.entries[stack.index]
  const previous = stack.entries[stack.index - 1]
  return isTicketsOutputEntry(current) && isTicketsFormEntry(previous)
}

export function canGoForwardInTicketsStack(stack: NavigationStack): boolean {
  if (stack.index >= stack.entries.length - 1) return false
  const current = stack.entries[stack.index]
  const next = stack.entries[stack.index + 1]
  return isTicketsFormEntry(current) && isTicketsOutputEntry(next)
}

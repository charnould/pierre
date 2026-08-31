import { snapshotsEqual, type NavigationSnapshot } from '@/shared/lib/navigation-snapshot'

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

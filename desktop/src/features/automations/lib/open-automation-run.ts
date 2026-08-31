import type { ReaderTarget } from '@/features/activity/lib/reader-target'

/** Open an automation HTML report in the offline modal shell (or fall back to reader). */
export function openAutomationRun(target: ReaderTarget): void {
  if (target.kind !== 'automation') return
  const html = target.content?.trim()
  if (html) {
    void window.api?.openAutomationReport({ html })
    return
  }
}

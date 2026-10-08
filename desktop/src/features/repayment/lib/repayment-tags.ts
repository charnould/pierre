import {
  canonicalizeCaseTags,
  normalizeCaseTagOptions,
  sameCaseTagSet
} from '@/shared/lib/activities/case-workflow-config'
import { repaymentSetup } from '@/shared/lib/instance-customization'
import type { ColumnValueStyle } from '@/shared/lib/ui-settings/tickets-table'
import { type Activity, parseCaseChangeContent } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'

export function repaymentTagOptions(): string[] {
  return normalizeCaseTagOptions(repaymentSetup().tags)
}

export type RepaymentTagOption = {
  label: string
  color: ColumnValueStyle
}

export const REPAYMENT_TAG_COLOR: ColumnValueStyle = { bgColor: '#E8E8E8', textColor: '#333333' }

export function canonicalizeRepaymentTags(selected: readonly string[]): string[] {
  return canonicalizeCaseTags(selected, repaymentTagOptions())
}

export function sameRepaymentTagSet(left: readonly string[], right: readonly string[]): boolean {
  return sameCaseTagSet(left, right, repaymentTagOptions())
}

export function getRepaymentTagMeta(label: string): RepaymentTagOption {
  return { label, color: REPAYMENT_TAG_COLOR }
}

/** Latest tag snapshot from shared case tag activities. */
export function deriveRepaymentTagsFromSorted(activities: readonly Activity[]): string[] {
  for (const row of activities) {
    if (row.type !== 'case.tags_changed') continue
    const parsed = parseCaseChangeContent(row.contenu)
    if (!parsed || !Array.isArray(parsed.after)) continue
    return canonicalizeRepaymentTags(
      parsed.after.map((entry) => (typeof entry === 'string' ? entry : entry.label))
    )
  }
  return []
}

export function deriveRepaymentTags(activities: Activity[]): string[] {
  return deriveRepaymentTagsFromSorted(sortRepaymentActivitiesDesc(activities))
}

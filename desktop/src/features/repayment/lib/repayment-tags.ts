import repaymentConfig from '@customization/repayments/config'

import {
  canonicalizeCaseTags,
  normalizeCaseTagOptions,
  sameCaseTagSet
} from '@/shared/lib/activities/case-workflow-config'
import type { ColumnValueStyle } from '@/shared/lib/ui-settings/tickets-table'
import { parse_case_tag_change_content, type Activite } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'

export const REPAYMENT_TAG_OPTIONS = normalizeCaseTagOptions(repaymentConfig.tags)

export type RepaymentTagOption = {
  label: string
  color: ColumnValueStyle
}

export const REPAYMENT_TAG_COLOR: ColumnValueStyle = { bgColor: '#E8E8E8', textColor: '#333333' }

export function canonicalizeRepaymentTags(selected: readonly string[]): string[] {
  return canonicalizeCaseTags(selected, REPAYMENT_TAG_OPTIONS)
}

export function sameRepaymentTagSet(left: readonly string[], right: readonly string[]): boolean {
  return sameCaseTagSet(left, right, REPAYMENT_TAG_OPTIONS)
}

export function getRepaymentTagMeta(label: string): RepaymentTagOption {
  return { label, color: REPAYMENT_TAG_COLOR }
}

/** Latest tag snapshot from shared case tag activities. */
export function deriveRepaymentTagsFromSorted(activities: readonly Activite[]): string[] {
  for (const row of activities) {
    if (row.type !== 'case_tag_change') continue
    const parsed = parse_case_tag_change_content(row.contenu)
    if (!parsed) continue
    return canonicalizeRepaymentTags(parsed.tags)
  }
  return []
}

export function deriveRepaymentTags(activities: Activite[]): string[] {
  return deriveRepaymentTagsFromSorted(sortRepaymentActivitiesDesc(activities))
}

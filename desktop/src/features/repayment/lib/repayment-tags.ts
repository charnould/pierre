import repaymentConfig from '@customization/repayments/config'

import type { ColumnValueStyle } from '@/shared/lib/ui-settings/tickets-table'
import { parse_repayment_tag_change_content, type Activite } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'

function buildTagOptions(): string[] {
  const raw = repaymentConfig.tags
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const label = entry.trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    tags.push(label)
  }
  return tags
}

export const REPAYMENT_TAG_OPTIONS = buildTagOptions()

export type RepaymentTagOption = {
  label: string
  color: ColumnValueStyle
}

export const REPAYMENT_TAG_COLOR: ColumnValueStyle = { bgColor: '#E8E8E8', textColor: '#333333' }

export function canonicalizeRepaymentTags(selected: readonly string[]): string[] {
  const selectedSet = new Set(selected.map((label) => label.trim()).filter(Boolean))
  return REPAYMENT_TAG_OPTIONS.filter((label) => selectedSet.has(label))
}

export function sameRepaymentTagSet(left: readonly string[], right: readonly string[]): boolean {
  const a = canonicalizeRepaymentTags(left)
  const b = canonicalizeRepaymentTags(right)
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

export function getRepaymentTagMeta(label: string): RepaymentTagOption {
  return { label, color: REPAYMENT_TAG_COLOR }
}

/** Latest tag snapshot from repayment_tag_change activities. */
export function deriveRepaymentTagsFromSorted(activities: readonly Activite[]): string[] {
  for (const row of activities) {
    if (row.type !== 'repayment_tag_change') continue
    const parsed = parse_repayment_tag_change_content(row.contenu)
    if (!parsed) continue
    return canonicalizeRepaymentTags(parsed.tags)
  }
  return []
}

export function deriveRepaymentTags(activities: Activite[]): string[] {
  return deriveRepaymentTagsFromSorted(sortRepaymentActivitiesDesc(activities))
}

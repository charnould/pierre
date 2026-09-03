import {
  canonicalizeCaseTags,
  normalizeCaseTagOptions,
  sameCaseTagSet
} from '@/shared/lib/activities/case-workflow-config'
import { ticketsSetup } from '@/shared/lib/instance-customization'

export function ticketTagOptions(): string[] {
  return normalizeCaseTagOptions(ticketsSetup().tags)
}

export function canonicalizeTicketTags(tags: readonly string[]): string[] {
  return canonicalizeCaseTags(tags, ticketTagOptions())
}

export function sameTicketTagSet(left: readonly string[], right: readonly string[]): boolean {
  return sameCaseTagSet(left, right, ticketTagOptions())
}

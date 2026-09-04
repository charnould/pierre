import ticketConfig from '@customization/tickets/config'

import {
  canonicalizeCaseTags,
  normalizeCaseTagOptions,
  sameCaseTagSet
} from '@/shared/lib/activities/case-workflow-config'

export const TICKET_TAG_OPTIONS = normalizeCaseTagOptions(ticketConfig.tags)

export function canonicalizeTicketTags(tags: readonly string[]): string[] {
  return canonicalizeCaseTags(tags, TICKET_TAG_OPTIONS)
}

export function sameTicketTagSet(left: readonly string[], right: readonly string[]): boolean {
  return sameCaseTagSet(left, right, TICKET_TAG_OPTIONS)
}

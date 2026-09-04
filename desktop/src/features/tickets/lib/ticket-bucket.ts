import ticketConfig from '@customization/tickets/config'

import {
  normalizeCaseBucketOptions,
  type CaseBucketOption
} from '@/shared/lib/activities/case-workflow-config'

export const NON_TRAITEES_TICKET_BUCKET_ID = 'non_traitees'

export const TICKET_BUCKET_OPTIONS = normalizeCaseBucketOptions(ticketConfig.buckets)
export type TicketBucketId = (typeof TICKET_BUCKET_OPTIONS)[number]['id']

export const TICKET_BUCKET_IDS = TICKET_BUCKET_OPTIONS.map(
  (option) => option.id
) as TicketBucketId[]

const BUCKET_BY_ID = Object.fromEntries(
  TICKET_BUCKET_OPTIONS.map((option) => [option.id, option])
) as Record<TicketBucketId, CaseBucketOption>

export function isTicketBucketId(value: string): value is TicketBucketId {
  return value in BUCKET_BY_ID
}

export function getTicketBucketMeta(id: TicketBucketId): CaseBucketOption {
  return BUCKET_BY_ID[id]
}

export function resolveTicketBucket(value: string | null | undefined): TicketBucketId {
  return value && isTicketBucketId(value)
    ? value
    : (NON_TRAITEES_TICKET_BUCKET_ID as TicketBucketId)
}

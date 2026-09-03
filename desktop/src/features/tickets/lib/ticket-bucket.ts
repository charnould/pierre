import {
  normalizeCaseBucketOptions,
  type CaseBucketOption
} from '@/shared/lib/activities/case-workflow-config'
import { ticketsSetup } from '@/shared/lib/instance-customization'

export const NON_TRAITEES_TICKET_BUCKET_ID = 'non_traitees'

export type TicketBucketId = string

export function ticketBucketOptions(): CaseBucketOption[] {
  return normalizeCaseBucketOptions(ticketsSetup().buckets)
}

export function ticketBucketIds(): TicketBucketId[] {
  return ticketBucketOptions().map((option) => option.id)
}

function bucketById(): Record<string, CaseBucketOption> {
  return Object.fromEntries(ticketBucketOptions().map((option) => [option.id, option]))
}

export function isTicketBucketId(value: string): value is TicketBucketId {
  return value in bucketById()
}

export function getTicketBucketMeta(id: TicketBucketId): CaseBucketOption {
  return bucketById()[id] ?? { id, label: id }
}

export function resolveTicketBucket(value: string | null | undefined): TicketBucketId {
  return value && isTicketBucketId(value) ? value : NON_TRAITEES_TICKET_BUCKET_ID
}

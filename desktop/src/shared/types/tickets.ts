/**
 * Dynamic row returned by `/desktop/tickets`.
 *
 * `id_reclamation` is the stable ticket identifier used for row selection and deep links.
 */
export type TicketRow = {
  id_reclamation?: string | number | null
  draft_id_skills?: string[]
  draft_answer_channel?: string
  draft_latest_at?: string
  draft_generated_by?: string
  draft_edited_by?: string
  draft_automation_skills?: string[]
  [key: string]: unknown
}

export type TicketsColumnMeta = { name: string; type: string }

export type TicketsFacetsResponse = {
  column: string
  values: string[]
  total: number
  filterable: boolean
}

export type TicketFilterRule =
  | { kind: 'values'; column: string; values: string[] }
  | { kind: 'compare'; column: string; operator: 'gt' | 'gte' | 'lt' | 'lte'; value: string }

export type TicketsQueryParams = {
  url: string
  limit?: number
  offset?: number
  sort?: string
  filters?: Record<string, string[]>
  filter_rules?: TicketFilterRule[]
}

export type TicketsListResponse = {
  data: TicketRow[]
  meta: {
    total: number
    limit: number
    offset: number
    columns: TicketsColumnMeta[]
    default_sort: string
  }
}

export type PutTicketPayload = {
  id_reclamation: string
  id_locataire: string
  message?: string
}

export type PutTicketResult = {
  ok: boolean
  id_reclamation?: string
  id_locataire?: string
}

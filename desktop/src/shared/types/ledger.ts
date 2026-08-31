import type { Activite } from './activites'

export type LedgerRow = Record<string, unknown>

export type LedgerMovementRow = LedgerRow & {
  date_exigibilite?: string | null
  montant_en_euros?: number | null
  categorie?: string | null
  mois_concerne?: string | null
}

export type LedgerColumnMeta = { name: string; type: string }

export type LedgerQueryParams = {
  url: string
  limit?: number
  offset?: number
  sort?: string
  /** Forwarded as repeated query params to `GET /desktop/ledger`. */
  filters?: Record<string, string[]>
}

export type LedgerListResponse = {
  data: LedgerRow[]
  meta: {
    total: number
    limit: number
    offset: number
    snapshot_date: string | null
    columns: LedgerColumnMeta[]
    default_sort: string
    /** True when CSV `gestionnaire` is unused — Pierre may assign. */
    gestionnaire_assignable?: boolean
  }
}

export type RepaymentTimelineQueryParams = {
  url: string
  id_locataire: string
}

export type RepaymentTimelineResponse = {
  data: {
    movements: LedgerMovementRow[]
    notifications: Activite[]
    openActionEvents: Activite[]
  }
  errors: {
    movements: boolean
    notifications: boolean
    openActions: boolean
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react'

import { warnRenderer } from '@/shared/lib/renderer-log'
import {
  RECLAMATIONS_PAGE_SIZE,
  filtersToQueryParams,
  type ColumnFilters
} from '@/shared/lib/ui-settings/tickets-table'
import type { TicketRow, TicketsColumnMeta, TicketsListResponse } from '@/shared/types'

export type UseTicketsOptions = {
  columnFilters?: ColumnFilters
  /** Increment to refetch the current page (e.g. after saving a draft). */
  refreshNonce?: number
}

export function useTickets(
  url: string | undefined,
  hidden: boolean,
  options: UseTicketsOptions = {}
) {
  const columnFilters = options.columnFilters

  const [data, setData] = useState<TicketRow[]>([])
  const [columns, setColumns] = useState<TicketsColumnMeta[]>([])
  const [meta, setMeta] = useState<TicketsListResponse['meta'] | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtersKey = useMemo(() => JSON.stringify(columnFilters ?? {}), [columnFilters])

  useEffect(() => {
    setOffset(0)
  }, [filtersKey, url])

  const reload = useCallback(async () => {
    if (!url || !window.api?.getTickets) return
    setLoading(true)
    setError(null)
    try {
      const filters = filtersToQueryParams(columnFilters)
      const hasFilters = Object.keys(filters).length > 0
      let res = await window.api.getTickets({
        url,
        limit: RECLAMATIONS_PAGE_SIZE,
        offset,
        filters
      })
      // A stale persisted filter key can make the backend reject the request.
      // Retry once without filters so the table can recover and reload schema.
      if (
        hasFilters &&
        (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0)
      ) {
        res = await window.api.getTickets({
          url,
          limit: RECLAMATIONS_PAGE_SIZE,
          offset,
          filters: {}
        })
      }
      if (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0) {
        throw new Error('missing_schema')
      }
      setData(Array.isArray(res.data) ? res.data : [])
      setColumns(res.meta.columns)
      setMeta(res.meta)
    } catch (error) {
      warnRenderer('useTickets.reload', error)
      setError('Impossible de charger les réclamations.')
      setData([])
      setColumns([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [url, offset, columnFilters])

  const refreshNonce = options.refreshNonce

  useEffect(() => {
    if (hidden || !url) return
    void reload()
  }, [hidden, url, reload, refreshNonce])

  const total = meta?.total ?? 0
  const canPrevPage = offset > 0
  const canNextPage = offset + data.length < total

  const prevPage = useCallback(() => {
    setOffset((current) => Math.max(0, current - RECLAMATIONS_PAGE_SIZE))
  }, [])

  const nextPage = useCallback(() => {
    setOffset((current) => current + RECLAMATIONS_PAGE_SIZE)
  }, [])

  return {
    data,
    columns,
    meta,
    loading,
    error,
    offset,
    reload,
    prevPage,
    nextPage,
    canPrevPage,
    canNextPage
  }
}

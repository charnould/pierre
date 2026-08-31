import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { warnRenderer } from '@/shared/lib/renderer-log'
import { createRequestSequencer } from '@/shared/lib/request-sequencer'
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

type TicketsSnapshot = {
  queryKey: string
  data: TicketRow[]
  columns: TicketsColumnMeta[]
  meta: TicketsListResponse['meta'] | null
  error: string | null
}

export function useTickets(
  url: string | undefined,
  hidden: boolean,
  options: UseTicketsOptions = {}
) {
  const columnFilters = options.columnFilters
  const refreshNonce = options.refreshNonce
  const filtersKey = useMemo(() => JSON.stringify(columnFilters ?? {}), [columnFilters])

  const [page, setPage] = useState({ filtersKey, url, offset: 0 })
  const filtersOrUrlChanged = page.filtersKey !== filtersKey || page.url !== url
  if (filtersOrUrlChanged) {
    setPage({ filtersKey, url, offset: 0 })
  }
  const offset = filtersOrUrlChanged ? 0 : page.offset
  const queryKey = `${url ?? ''}\0${filtersKey}\0${offset}\0${refreshNonce ?? 0}`

  const [snapshot, setSnapshot] = useState<TicketsSnapshot>({
    queryKey: '',
    data: [],
    columns: [],
    meta: null,
    error: null
  })
  const [refreshing, setRefreshing] = useState(false)
  const sequencerRef = useRef(createRequestSequencer())

  const fetchPage = useCallback(async () => {
    if (!url || !window.api?.getTickets) return
    const token = sequencerRef.current.begin()
    const capturedKey = queryKey
    const capturedOffset = offset
    try {
      const filters = filtersToQueryParams(columnFilters)
      const hasFilters = Object.keys(filters).length > 0
      let res = await window.api.getTickets({
        url,
        limit: RECLAMATIONS_PAGE_SIZE,
        offset: capturedOffset,
        filters
      })
      if (
        hasFilters &&
        (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0)
      ) {
        res = await window.api.getTickets({
          url,
          limit: RECLAMATIONS_PAGE_SIZE,
          offset: capturedOffset,
          filters: {}
        })
      }
      if (!sequencerRef.current.isCurrent(token)) return
      if (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0) {
        throw new Error('missing_schema')
      }
      setSnapshot({
        queryKey: capturedKey,
        data: Array.isArray(res.data) ? res.data : [],
        columns: res.meta.columns,
        meta: res.meta,
        error: null
      })
    } catch (error) {
      if (!sequencerRef.current.isCurrent(token)) return
      warnRenderer('useTickets.reload', error)
      setSnapshot({
        queryKey: capturedKey,
        data: [],
        columns: [],
        meta: null,
        error: 'Impossible de charger les réclamations.'
      })
    }
  }, [columnFilters, offset, queryKey, url])

  useEffect(() => {
    if (hidden || !url || !window.api?.getTickets) return
    const token = sequencerRef.current.begin()
    const capturedKey = queryKey
    const capturedOffset = offset
    const filters = filtersToQueryParams(columnFilters)
    const hasFilters = Object.keys(filters).length > 0
    void window.api
      .getTickets({
        url,
        limit: RECLAMATIONS_PAGE_SIZE,
        offset: capturedOffset,
        filters
      })
      .then(async (first) => {
        let res = first
        if (
          hasFilters &&
          (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0)
        ) {
          res = await window.api.getTickets({
            url,
            limit: RECLAMATIONS_PAGE_SIZE,
            offset: capturedOffset,
            filters: {}
          })
        }
        return res
      })
      .then((res) => {
        if (!sequencerRef.current.isCurrent(token)) return
        if (!res || !Array.isArray(res.meta?.columns) || res.meta.columns.length === 0) {
          throw new Error('missing_schema')
        }
        setSnapshot({
          queryKey: capturedKey,
          data: Array.isArray(res.data) ? res.data : [],
          columns: res.meta.columns,
          meta: res.meta,
          error: null
        })
      })
      .catch((error) => {
        if (!sequencerRef.current.isCurrent(token)) return
        warnRenderer('useTickets.reload', error)
        setSnapshot({
          queryKey: capturedKey,
          data: [],
          columns: [],
          meta: null,
          error: 'Impossible de charger les réclamations.'
        })
      })
  }, [columnFilters, hidden, offset, queryKey, url])

  const reload = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchPage()
    } finally {
      setRefreshing(false)
    }
  }, [fetchPage])

  const loading = Boolean(url) && !hidden && (snapshot.queryKey !== queryKey || refreshing)
  const data = snapshot.data
  const columns = snapshot.columns
  const meta = snapshot.meta
  const error = snapshot.queryKey === queryKey ? snapshot.error : null

  const total = meta?.total ?? 0
  const canPrevPage = offset > 0
  const canNextPage = offset + data.length < total

  const prevPage = useCallback(() => {
    setPage((current) => ({
      ...current,
      offset: Math.max(0, current.offset - RECLAMATIONS_PAGE_SIZE)
    }))
  }, [])

  const nextPage = useCallback(() => {
    setPage((current) => ({
      ...current,
      offset: current.offset + RECLAMATIONS_PAGE_SIZE
    }))
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

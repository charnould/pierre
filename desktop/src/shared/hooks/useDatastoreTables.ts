import { useEffect, useState } from 'react'

import type { DatastoreTableStatus } from '@/shared/types/datastore-tables'

export function useDatastoreTables(url: string | undefined): {
  tables: DatastoreTableStatus[] | null
  loading: boolean
} {
  const requestKey = url?.trim() ?? ''
  const [snapshot, setSnapshot] = useState<{
    key: string
    tables: DatastoreTableStatus[] | null
  } | null>(null)

  useEffect(() => {
    if (!requestKey) return

    let cancelled = false
    void window.api
      .getDatastoreTables({ url: requestKey })
      .then((response) => {
        if (cancelled) return
        setSnapshot({ key: requestKey, tables: response?.tables ?? null })
      })
      .catch(() => {
        if (cancelled) return
        setSnapshot({ key: requestKey, tables: null })
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  if (!requestKey) {
    return { tables: null, loading: false }
  }

  return {
    tables: snapshot?.key === requestKey ? snapshot.tables : null,
    loading: snapshot?.key !== requestKey
  }
}

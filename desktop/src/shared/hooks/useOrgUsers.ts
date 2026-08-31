import { useEffect, useState } from 'react'

import { fetchOrgUsers, resolveOrgUsersUrl } from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

export type OrgUsersState = {
  users: OrgUser[]
  loading: boolean
}

/** Org users for @mentions and collaborator pickers. Cached per server URL. */
export function useOrgUsers(url?: string): OrgUsersState {
  const requestKey = url ?? ''
  const [snapshot, setSnapshot] = useState<{ key: string; users: OrgUser[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    void resolveOrgUsersUrl(url)
      .then((base) => (base ? fetchOrgUsers(base) : []))
      .then((list) => {
        if (cancelled) return
        setSnapshot({ key: requestKey, users: list })
      })
      .catch(() => {
        if (cancelled) return
        setSnapshot({ key: requestKey, users: [] })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, url])

  return {
    users: snapshot?.key === requestKey ? snapshot.users : [],
    loading: snapshot?.key !== requestKey
  }
}

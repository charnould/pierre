import { useSyncExternalStore } from 'react'

import {
  getOrgUsersCacheVersion,
  resolveUserAvatar,
  subscribeOrgUsersCache
} from '@/shared/lib/org-users-cache'

export function useOrgUsersVersion(): number {
  return useSyncExternalStore(subscribeOrgUsersCache, getOrgUsersCacheVersion, () => 0)
}

export function useUserAvatar(login: string | undefined): string | null {
  const key = login?.trim().toLowerCase() ?? ''
  useOrgUsersVersion()
  if (!key) return null
  return resolveUserAvatar(key)
}

import { useEffect, useSyncExternalStore } from 'react'

import {
  ensureUserAvatar,
  getOrgUsersCacheVersion,
  resolveOrgUserByLoginOrEmail,
  resolveUserAvatar,
  subscribeOrgUsersCache
} from '@/shared/lib/org-users-cache'

export function useOrgUsersVersion(): number {
  return useSyncExternalStore(subscribeOrgUsersCache, getOrgUsersCacheVersion, () => 0)
}

export function useUserAvatar(login: string | undefined): string | null {
  const key = login?.trim().toLowerCase() ?? ''
  useOrgUsersVersion()
  const user = key ? resolveOrgUserByLoginOrEmail(key) : null
  const requestKey = user?.hasAvatar ? `${user.email}\0${user.avatarVersion}` : ''
  useEffect(() => {
    if (requestKey) ensureUserAvatar(key)
  }, [key, requestKey])
  if (!key) return null
  return resolveUserAvatar(key)
}

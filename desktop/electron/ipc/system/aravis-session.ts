import { session } from 'electron'

import { aravisLoginOrigin } from '../../../src/shared/lib/aravis-login-url'

export const ARAVIS_PARTITION = 'persist:aravis'

export async function hasAravisSessionForUrl(loginUrl: string): Promise<boolean> {
  const origin = aravisLoginOrigin(loginUrl)
  if (!origin) return false

  const ses = session.fromPartition(ARAVIS_PARTITION)
  const cookies = await ses.cookies.get({ url: `${origin}/` })
  return cookies.some((cookie) => Boolean(cookie.name && cookie.value))
}

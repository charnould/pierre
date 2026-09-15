import type { Context } from 'hono'

import type { User } from '../utils/_schema'

export const provider_not_configured_controller = (channel: 'email' | 'sms') => (c: Context) => {
  const user = c.get('user') as User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  return c.json(
    {
      error: {
        code: 'provider_not_configured',
        message: `Aucun prestataire ${channel} n'est configuré`
      }
    },
    501
  )
}

import type { Context } from 'hono'

import { view } from '../../views/admin.index'

export const controller = async (c: Context) => {
  let desktop_version: string | null = null
  try {
    const pkg = await Bun.file('desktop/package.json').json()
    desktop_version = pkg.version ?? null
  } catch {
    // file absent or unreadable — stay null
  }
  return c.html(view(c.get('user'), desktop_version))
}

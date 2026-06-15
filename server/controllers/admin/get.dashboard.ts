import { existsSync, readFileSync } from 'fs'

import type { Context } from 'hono'

import { view } from '../../views/admin.index'

export const controller = async (c: Context) => {
  let desktop_version: string | null = null
  try {
    const path = 'desktop/package.json'
    if (existsSync(path)) {
      const pkg = JSON.parse(readFileSync(path, 'utf-8'))
      desktop_version = pkg.version ?? null
    }
  } catch {
    // file absent or unreadable — stay null
  }
  return c.html(view(c.get('user'), desktop_version))
}

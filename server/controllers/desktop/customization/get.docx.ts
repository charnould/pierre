import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { Context } from 'hono'

import {
  CUSTOMIZATION_DIR,
  CUSTOMIZATION_SKILLS_DIR,
  resolvePathWithin
} from '../../../utils/paths'

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function sendDocx(path: string) {
  const file = Bun.file(path)
  if (!(await file.exists())) return null
  return new Response(file, { headers: { 'content-type': DOCX_TYPE } })
}

export const repaymentTemplate = async (c: Context) => {
  const path = join(CUSTOMIZATION_DIR, 'repayments', 'templates', 'template.docx')
  return (await sendDocx(path)) ?? c.notFound()
}

export const skillTemplate = async (c: Context) => {
  const id = c.req.param('id') ?? ''
  if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) return c.notFound()
  let dir: string
  try {
    dir = resolvePathWithin(CUSTOMIZATION_SKILLS_DIR, id)
  } catch {
    return c.notFound()
  }
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return c.notFound()
  return (await sendDocx(join(dir, 'template.docx'))) ?? c.notFound()
}

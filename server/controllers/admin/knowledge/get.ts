import { Database } from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'

import { datastorePaths } from '../../../utils/paths'
import { view } from '../../../views/admin.knowledge'

export const controller = async (c: Context) => {
  try {
    const paths = datastorePaths()
    const files = await readdir(paths.files)

    let metadata: Metadata[] = []

    for (const f of files) {
      const file_path = join(paths.files, f)
      const file = Bun.file(file_path)
      const stats = await file.stat()

      metadata.push({
        filename: f,
        size: stats.size,
        filepath: `datastores/files/${f}`,
        last_access_time: new Date(stats.atimeMs).toISOString().slice(0, -5),
        last_modification_time: new Date(stats.mtimeMs).toISOString().slice(0, -5),
        file_creation: new Date(stats.birthtimeMs).toISOString().slice(0, -5)
      })
    }

    metadata = metadata.sort((a, b) =>
      a.filename.localeCompare(b.filename, 'fr', { sensitivity: 'base' })
    )

    const db = new Database(paths.database)
    const events = db
      .query<KnowledgeBuildRow, []>(
        `SELECT source, kind, code, subject
         FROM knowledge_build
         ORDER BY
           CASE kind WHEN 'error' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END,
           id`
      )
      .all()

    return c.html(view(metadata, events))
  } catch (e) {
    console.log(e)
  }
}

export type Metadata = {
  filename: string
  filepath: string
  size: number
  last_access_time: string
  last_modification_time: string
  file_creation: string
}

export type KnowledgeBuildRow = {
  source: 'cli' | 'pipeline'
  kind: 'action' | 'info' | 'warning' | 'error'
  code: string
  subject: string | null
}

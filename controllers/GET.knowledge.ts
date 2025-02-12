import { readdir } from 'node:fs/promises'
import type { Context } from 'hono'
import { view } from '../views/knowledge'

export const controller = async (c: Context) => {
  try {
    const files = await readdir('datastores/files')

    let metadata: Metadata[] = []

    for (const f of files) {
      const file = Bun.file(`datastores/files/${f}`)
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

    return c.html(view(metadata))
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

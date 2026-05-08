import { Database } from 'bun:sqlite'

import type { Context } from 'hono'

import { run_pipeline } from '../utils/knowledge/run-pipeline'
import { normalize_knowledge_name } from '../utils/knowledge/utils'

/**
 * Handles POST requests for knowledge management operations.
 *
 * Supports multiple actions through the 'action' query parameter:
 * - 'upload': Uploads files to the datastore (via web UI or CLI)
 * - 'download': Downloads a file from the datastore
 * - 'destroy': Deletes a file from the datastore
 * - 'rebuild': Forces a knowledge pipeline rebuild
 *
 * @param {Context} c - The Hono context object containing request/response details
 * @returns {Promise<Response>} JSON response for uploads/CLI requests, file stream for downloads, or redirect to knowledge page
 *
 * @example
 * // Upload files via CLI
 * // POST /api/knowledge?action=upload
 * // Headers: authorization-context: cli
 *
 * @example
 * // Download a file
 * // POST /api/knowledge?action=download
 * // Body: { filename: 'document.pdf' }
 *
 * @throws {Error} Logs errors to console without explicit error response
 */
export const controller = async (c: Context) => {
  try {
    const body = await c.req.parseBody({ all: true })
    const files = ([] as File[]).concat(body.files ?? body['files[]'] ?? [])
    const filename = body.filename ?? undefined
    const action = c.req.query('action')

    // CASE 1: User wants to upload files (either via web UI or cURL)
    if (action === 'upload' || c.req.header('authorization-context') === 'cli') {
      // Determine target service
      const service =
        c.req.header('authorization-context') === 'cli'
          ? (body.service as string)
          : Bun.env['SERVICE']

      // Save each uploaded file
      for (const file of files) {
        // Preserve _metadata.xlsx as a reserved system filename
        const filename =
          file.name === '_metadata.xlsx'
            ? file.name
            : normalize_knowledge_name(file.name.normalize('NFC'), {
                preserve_extension: true
              })
        const path = `datastores/${service}/files/${filename}`
        await Bun.write(path, file)
      }

      // Respond for CLI uploads with JSON
      if (c.req.header('authorization-context') === 'cli') {
        const uploaded_names = files.map((f) =>
          f.name === '_metadata.xlsx'
            ? f.name
            : normalize_knowledge_name(f.name.normalize('NFC'), {
                preserve_extension: true
              })
        )

        // Record each CLI upload in knowledge_build
        const db = new Database(`datastores/${service}/datastore.sqlite`)
        const stmt = db.prepare(
          "INSERT INTO knowledge_build (created_at, source, kind, code, subject) VALUES (?, 'cli', 'action', 'CLI_UPLOAD', ?)"
        )
        const now = new Date().toISOString()
        for (const name of uploaded_names) {
          stmt.run(now, name)
        }

        return c.json({ status: 'ok', uploaded: uploaded_names }, 200)
      }
    }

    // CASE 2: User wants to download a file
    if (action === 'download') {
      const file = Bun.file(`datastores/${Bun.env['SERVICE']}/files/${filename as string}`)
      const stream = file.stream()

      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      c.header('Content-Type', file.type)
      return c.body(stream)
    }

    // CASE 3: User wants to delete a file
    if (action === 'destroy') {
      await Bun.file(`datastores/${Bun.env['SERVICE']}/files/${filename as string}`).delete()
    }

    // CASE 4: Force knowledge rebuild
    if (action === 'rebuild') {
      await run_pipeline()
    }

    return c.redirect('/a/knowledge')
  } catch (error) {
    console.log(error)
  }
}

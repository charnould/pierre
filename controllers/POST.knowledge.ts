import type { Context } from 'hono'
import { execute_pipeline } from '../utils/knowledge/_run'
import { encode_filename } from '../utils/knowledge/generate-hash'

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
        c.req.header('authorization-context') === 'cli' ? (body.service as string) : Bun.env.SERVICE

      // Save each uploaded file
      for (const file of files) {
        const filename = encode_filename(file.name)
        const path = `datastores/${service}/files/${filename}`
        await Bun.write(path, file)
      }

      // Respond for CLI uploads with JSON
      if (c.req.header('authorization-context') === 'cli') {
        return c.json({ status: 'ok', uploaded: files.map((f) => f.name) }, 200)
      }
    }

    // CASE 2: User wants to download a file
    if (action === 'download') {
      const file = Bun.file(
        `datastores/${Bun.env.SERVICE}/files/${encode_filename(filename as string)}`
      )
      const stream = file.stream()

      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      c.header('Content-Type', file.type)
      return c.body(stream)
    }

    // CASE 3: User wants to delete a file
    if (action === 'destroy') {
      await Bun.file(
        `datastores/${Bun.env.SERVICE}/files/${encode_filename(filename as string)}`
      ).delete()
    }

    // CASE 4: Force knwoledge rebuild
    if (action === 'rebuild') {
      await execute_pipeline({ proprietary: true, community: false })
    }

    return c.redirect('/a/knowledge')
  } catch (error) {
    console.log(error)
  }
}

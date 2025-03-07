import type { Context } from 'hono'
import { execute_pipeline } from '../utils/knowledge/_run'
import { encode_filename } from '../utils/knowledge/generate-hash'

/**
 * Handles various actions related to file management and knowledge rebuilding.
 *
 * @param {Context} c - The context object containing request and response information.
 *
 * @throws Will log an error if any operation fails.
 *
 * The function supports the following actions:
 *
 * - `upload`: Uploads files to the `datastores/files` directory..
 * - `download`: Downloads a specified file from the `datastores/files` directory.
 * - `destroy`: Deletes a specified file from the `datastores/files` directory.
 * - `rebuild`: Forces a knowledge rebuilds.
 *
 * After completing the action, the function redirects to the `/a/knowledge` route.
 */
export const controller = async (c: Context) => {
  try {
    const body = await c.req.parseBody({ all: true })
    const files = (Array.isArray(body.files) ? body.files : [body.files]) as File[]
    const filename = body.filename ?? undefined
    const action = c.req.query('action')

    // CASE 1: User wants to upload files
    if (action === 'upload') {
      for (const file of files) {
        await Bun.write(`datastores/${Bun.env.SERVICE}/files/${encode_filename(file.name)}`, file)
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

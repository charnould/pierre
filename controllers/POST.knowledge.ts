import type { Context } from 'hono'

/**
 * Handles various actions related to file management such as upload, download, and destroy.
 *
 * @param {Context} c - The context object containing request and response information.
 *
 * The function performs the following actions based on the 'action' query parameter:
 *
 * - `upload`: Uploads files to the 'datastores/files' directory.
 *    The filenames are normalized to remove diacritics and replace special characters.
 * - `download`: Streams the requested file to the client with appropriate headers for download.
 * - `destroy`: Deletes the specified file from the 'datastores/files' directory.
 *
 * After performing the action, the function redirects to the '/a/knowledge' route.
 *
 * @returns {Promise} - A promise that resolves when the action is complete.
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
        const normalized_filename = file.name
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace('’', "'")

        await Bun.write(`datastores/files/${normalized_filename}`, file)
      }
    }

    // CASE 2: User wants to download a file
    if (action === 'download') {
      const file = Bun.file(`datastores/files/${filename}`)
      const stream = file.stream()

      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      c.header('Content-Type', file.type)
      return c.body(stream)
    }

    // CASE 3: User wants to delete a file
    if (action === 'destroy') {
      await Bun.file(`datastores/files/${filename}`).delete()
    }

    return c.redirect('/a/knowledge')
  } catch (error) {
    console.log(error)
  }
}

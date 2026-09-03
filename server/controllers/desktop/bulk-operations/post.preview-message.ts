import type { Context } from 'hono'
import { z } from 'zod'

import type { Parsed_User } from '../../../utils/_schema'
import { BulkDocxError } from '../../../utils/bulk/docx'
import { preview_message } from '../../../utils/bulk/preview'
import { BulkOperationDefinitionSchema, BulkQueryError } from '../../../utils/bulk/query'

const BodySchema = z.object({
  definition: BulkOperationDefinitionSchema,
  id_locataire: z.string().trim().min(1),
  bulkOperationId: z.string().trim().min(1).optional(),
  nodeId: z.string().trim().min(1).optional()
})

export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'invalid_body',
          message: parsed.error.issues.map((issue) => issue.message).join('; ')
        }
      },
      400
    )
  }
  try {
    return c.json({
      data: await preview_message({
        definition: parsed.data.definition,
        id_locataire: parsed.data.id_locataire,
        bulkOperationId: parsed.data.bulkOperationId,
        nodeId: parsed.data.nodeId
      })
    })
  } catch (error) {
    if (error instanceof BulkQueryError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    if (error instanceof BulkDocxError) {
      return c.json({ error: { code: 'preview_failed', message: error.message } }, 400)
    }
    console.error('[post.desktop.bulk-operations.preview-message]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Prévisualisation impossible' } },
      500
    )
  }
}

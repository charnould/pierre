import { Hono } from 'hono'
import { z } from 'zod'

import { login_from_email } from '../utils/activities/rows'
import { type AuthContext, authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeAdministrator, authorizeModule } from '../utils/authorize-role'
import { BulkDocxError } from '../utils/bulk/docx'
import { preview_message, preview_query } from '../utils/bulk/preview'
import { BulkOperationDefinitionSchema, BulkQueryError } from '../utils/bulk/query'
import { list_bulk_reports } from '../utils/bulk/reports'
import { BulkExecutionError, execute_bulk_operation } from '../utils/bulk/send'
import {
  BulkOperationsError,
  create_bulk_operation,
  CreateBulkOperationBodySchema,
  delete_bulk_operation,
  get_bulk_operation,
  list_bulk_operations,
  PatchBulkOperationBodySchema,
  update_bulk_operation
} from '../utils/bulk/store'

const PreviewQueryBodySchema = z.object({
  definition: BulkOperationDefinitionSchema,
  bulkOperationId: z.string().trim().min(1).optional(),
  offset: z.number().int().nonnegative().optional()
})

const PreviewMessageBodySchema = z.object({
  definition: BulkOperationDefinitionSchema,
  id_locataire: z.string().trim().min(1),
  bulkOperationId: z.string().trim().min(1).optional(),
  nodeId: z.string().trim().min(1).optional()
})

const ExecuteBodySchema = z
  .object({
    mode: z.enum(['send', 'apply_without_send']),
    clientCommandId: z.string().trim().min(1)
  })
  .strict()

export const previewBulkQuery = async (c: AuthContext) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = PreviewQueryBodySchema.safeParse(body)
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
      data: preview_query({
        definition: parsed.data.definition,
        bulkOperationId: parsed.data.bulkOperationId,
        offset: parsed.data.offset
      })
    })
  } catch (error) {
    if (error instanceof BulkQueryError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    console.error('[bulk.preview.query]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Prévisualisation impossible' } },
      500
    )
  }
}

export const previewBulkMessage = async (c: AuthContext) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = PreviewMessageBodySchema.safeParse(body)
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
    console.error('[bulk.preview.message]', error)
    return c.json(
      { error: { code: 'internal_error', message: 'Prévisualisation impossible' } },
      500
    )
  }
}

export const listBulkOperations = async (c: AuthContext) => {
  return c.json({ data: list_bulk_operations() })
}

export const createBulkOperation = async (c: AuthContext) => {
  const user = c.get('user')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = CreateBulkOperationBodySchema.safeParse(body)
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
    return c.json({ data: create_bulk_operation(login_from_email(user.email), parsed.data) }, 201)
  } catch (error) {
    if (error instanceof BulkOperationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, 400)
    }
    console.error('[bulk.create]', error)
    return c.json({ error: { code: 'internal_error', message: 'Création impossible' } }, 500)
  }
}

export const listBulkOperationReports = (c: AuthContext) => {
  const id = c.req.param('id')!
  if (!get_bulk_operation(id)) {
    return c.json({ error: { code: 'not_found', message: 'Bulk operation not found' } }, 404)
  }
  return c.json({ data: list_bulk_reports(id) })
}

export const getBulkOperation = async (c: AuthContext) => {
  const bulkOperation = get_bulk_operation(c.req.param('id')!)
  if (!bulkOperation) {
    return c.json({ error: { code: 'not_found', message: 'Bulk operation not found' } }, 404)
  }
  return c.json({ data: bulkOperation })
}

export const patchBulkOperation = async (c: AuthContext) => {
  const user = c.get('user')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = PatchBulkOperationBodySchema.safeParse(body)
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
      data: update_bulk_operation(c.req.param('id')!, login_from_email(user.email), parsed.data)
    })
  } catch (error) {
    if (error instanceof BulkOperationsError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'conflict'
              ? 409
              : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[bulk.patch]', error)
    return c.json({ error: { code: 'internal_error', message: 'Enregistrement impossible' } }, 500)
  }
}

export const deleteBulkOperation = async (c: AuthContext) => {
  try {
    return c.json({
      data: delete_bulk_operation(c.req.param('id')!)
    })
  } catch (error) {
    if (error instanceof BulkOperationsError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'conflict'
              ? 409
              : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[bulk.delete]', error)
    return c.json({ error: { code: 'internal_error', message: 'Suppression impossible' } }, 500)
  }
}

export const executeBulkOperation = async (c: AuthContext) => {
  const user = c.get('user')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const parsed = ExecuteBodySchema.safeParse(body)
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
      data: await execute_bulk_operation(user.email, c.req.param('id')!, parsed.data)
    })
  } catch (error) {
    if (error instanceof BulkExecutionError) {
      const status = error.code === 'not_found' ? 404 : 400
      return c.json({ error: { code: error.code, message: error.message } }, status)
    }
    console.error('[bulk.execute]', error)
    return c.json({ error: { code: 'internal_error', message: 'Envoi impossible' } }, 500)
  }
}

export const bulk = new Hono<AuthEnv>()

bulk.use('*', authenticate, authorizeModule('bulk'))
bulk.post('/preview/query', previewBulkQuery)
bulk.post('/preview/message', previewBulkMessage)
bulk.get('/', listBulkOperations)
bulk.post('/', createBulkOperation)
bulk.get('/:id/reports', listBulkOperationReports)
bulk.get('/:id', getBulkOperation)
bulk.patch('/:id', patchBulkOperation)
bulk.delete('/:id', deleteBulkOperation)
bulk.post('/:id/execute', authorizeAdministrator, executeBulkOperation)

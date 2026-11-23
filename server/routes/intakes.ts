import { type Context, Hono } from 'hono'
import type { z } from 'zod/v4'

import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeModule } from '../utils/authorize-role'
import { IntakesError } from '../utils/intakes/errors'
import { export_intake_zip } from '../utils/intakes/export-zip'
import { CreateIntakeBodySchema, PatchIntakeBodySchema } from '../utils/intakes/schemas'
import {
  close_intake,
  create_intake,
  delete_intake,
  list_intakes,
  publish_intake,
  purge_intake,
  reopen_intake,
  revoke_intake,
  update_intake
} from '../utils/intakes/store'
import { get_intake_submission_file } from '../utils/intakes/submissions'

async function runIntake(
  c: Context<AuthEnv>,
  context: string,
  fn: () => Response | Promise<Response>
): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof IntakesError) {
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
    console.error(`[intakes.${context}]`, error)
    return c.json({ error: { code: 'internal_error', message: 'Erreur interne Collectes' } }, 500)
  }
}

async function parseJsonBody<T>(
  c: Context<AuthEnv>,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return {
      ok: false,
      response: c.json({ error: { code: 'invalid_body', message: 'JSON invalide' } }, 400)
    }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: {
            code: 'invalid_body',
            message: parsed.error.issues.map((issue) => issue.message).join(' ; ')
          }
        },
        400
      )
    }
  }
  return { ok: true, data: parsed.data }
}

function contentDispositionFilename(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function binaryDownloadResponse(bytes: Uint8Array, headers: Record<string, string>): Response {
  const body =
    bytes.buffer instanceof ArrayBuffer
      ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : bytes.slice()
  return new Response(body, { status: 200, headers })
}

export const intakes = new Hono<AuthEnv>()

intakes.use('*', authenticate, authorizeModule('intake'))

intakes.get('/', (c) => runIntake(c, 'list', () => c.json({ data: list_intakes(c.get('user')) })))

intakes.post('/', (c) =>
  runIntake(c, 'create', async () => {
    const parsed = await parseJsonBody(c, CreateIntakeBodySchema)
    if (!parsed.ok) return parsed.response
    return c.json({ data: create_intake(c.get('user').email, parsed.data) }, 201)
  })
)

intakes.patch('/:id', (c) =>
  runIntake(c, 'patch', async () => {
    const parsed = await parseJsonBody(c, PatchIntakeBodySchema)
    if (!parsed.ok) return parsed.response
    return c.json({ data: update_intake(c.req.param('id'), c.get('user'), parsed.data) })
  })
)

intakes.delete('/:id', (c) =>
  runIntake(c, 'delete', () => {
    delete_intake(c.req.param('id'), c.get('user'))
    return c.json({ data: { deleted: true } })
  })
)

intakes.post('/:id/publish', (c) =>
  runIntake(c, 'publish', () => c.json({ data: publish_intake(c.req.param('id'), c.get('user')) }))
)

intakes.post('/:id/revoke', (c) =>
  runIntake(c, 'revoke', () => c.json({ data: revoke_intake(c.req.param('id'), c.get('user')) }))
)

intakes.post('/:id/close', (c) =>
  runIntake(c, 'close', () => c.json({ data: close_intake(c.req.param('id'), c.get('user')) }))
)

intakes.post('/:id/reopen', (c) =>
  runIntake(c, 'reopen', () => c.json({ data: reopen_intake(c.req.param('id'), c.get('user')) }))
)

intakes.post('/:id/purge', (c) =>
  runIntake(c, 'purge', () => c.json({ data: purge_intake(c.req.param('id'), c.get('user')) }))
)

intakes.get('/:id/export.zip', (c) =>
  runIntake(c, 'export', () => {
    const exported = export_intake_zip(c.req.param('id'), c.get('user'))
    return binaryDownloadResponse(exported.bytes, {
      'content-type': 'application/zip',
      'content-disposition': contentDispositionFilename(exported.filename),
      'cache-control': 'no-store'
    })
  })
)

intakes.get('/:id/submissions/:submissionId/files/:filename', (c) =>
  runIntake(c, 'file', () => {
    const file = get_intake_submission_file(
      c.req.param('id'),
      c.req.param('submissionId'),
      c.req.param('filename'),
      c.get('user')
    )
    if (!file) {
      return c.json({ error: { code: 'not_found', message: 'Pièce jointe introuvable' } }, 404)
    }
    return binaryDownloadResponse(file.bytes, {
      'content-type': file.mimeType,
      'content-disposition': contentDispositionFilename(file.filename),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    })
  })
)

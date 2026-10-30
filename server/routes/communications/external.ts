import { z } from 'zod'

import { ACTIVITY_CONTEXTS, SUBMITTABLE_CHANNELS } from '../../../shared/activities'
import { businessModuleForActivityContext } from '../../../shared/modules'
import { parse_rcs_contenu } from '../../../shared/rcs-message'
import type { AuthContext } from '../../utils/authenticate-user'
import { userCanAccessModule } from '../../utils/authorize-role'
import { CommunicationsError, create_outbound } from '../../utils/communications/storage'

const envelope = {
  contexte: z.enum(ACTIVITY_CONTEXTS),
  ref: z.string().trim().min(1),
  destinataire: z.string().trim().min(1).optional(),
  imported: z.literal(true).optional()
}

const journal_meta = z
  .object({
    sender: z.string().trim().min(1).optional(),
    externalApplication: z
      .object({ name: z.string().trim().min(1) })
      .strict()
      .optional()
  })
  .strict()

const rcs_journal_contenu = journal_meta
  .extend({
    body: z.unknown(),
    sms_fallback: z.unknown().optional(),
    choices: z.unknown().optional()
  })
  .strict()

const email_like_contenu = journal_meta
  .extend({
    subject: z.string().trim().min(1).optional(),
    body: z.string(),
    action: z.string().trim().min(1).optional()
  })
  .strict()
  .refine((value) => Boolean(value.subject?.trim() || value.body.trim()), {
    message: 'subject ou body requis'
  })

const Body = z
  .object({
    channel: z.enum(SUBMITTABLE_CHANNELS),
    ...envelope,
    contenu: z.unknown()
  })
  .strict()

const error_status = (error: CommunicationsError): 400 | 403 | 404 | 409 =>
  error.code === 'forbidden'
    ? 403
    : error.code === 'not_found'
      ? 404
      : error.code === 'conflict'
        ? 409
        : 400

const zod_message = (error: z.ZodError) => error.issues.map((issue) => issue.message).join('; ')

/** Journalise une communication déjà envoyée hors Pierre, sans appeler de fournisseur. */
export const postExternal = async (c: AuthContext) => {
  const user = c.get('user')
  const idempotencyKey = c.req.header('Idempotency-Key')?.trim() ?? ''
  if (!z.uuid().safeParse(idempotencyKey).success) {
    return c.json(
      { error: { code: 'invalid_idempotency_key', message: 'Idempotency-Key UUID requis' } },
      400
    )
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_body', message: zod_message(parsed.error) } }, 400)
  }
  if (!userCanAccessModule(user, businessModuleForActivityContext(parsed.data.contexte))) {
    return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
  }

  let contenu: Record<string, unknown>
  if (parsed.data.channel === 'rcs') {
    const input = rcs_journal_contenu.safeParse(parsed.data.contenu)
    const rcs = input.success ? parse_rcs_contenu(input.data) : null
    if (!input.success || !rcs) {
      return c.json({ error: { code: 'invalid_body', message: 'Contenu RCS invalide' } }, 400)
    }
    contenu = {
      ...rcs,
      ...(input.data.sender ? { sender: input.data.sender } : {}),
      ...(input.data.externalApplication ? { provider: input.data.externalApplication.name } : {})
    }
  } else {
    const email = email_like_contenu.safeParse(parsed.data.contenu)
    if (!email.success) {
      return c.json({ error: { code: 'invalid_body', message: zod_message(email.error) } }, 400)
    }
    contenu = {
      body: email.data.body.trim(),
      ...(email.data.subject ? { subject: email.data.subject } : {}),
      ...(email.data.action ? { action: email.data.action } : {}),
      ...(email.data.sender ? { sender: email.data.sender } : {}),
      ...(email.data.externalApplication ? { provider: email.data.externalApplication.name } : {})
    }
  }

  try {
    const activity = create_outbound({
      actor: user.email,
      contexte: parsed.data.contexte,
      ref: parsed.data.ref,
      type: parsed.data.channel,
      destinataire: parsed.data.destinataire,
      allow_missing_destination: true,
      imported: parsed.data.imported,
      contenu: JSON.stringify(contenu),
      idempotency_key: idempotencyKey
    })
    return c.json({ data: activity }, 201)
  } catch (error) {
    if (error instanceof CommunicationsError) {
      return c.json({ error: { code: error.code, message: error.message } }, error_status(error))
    }
    throw error
  }
}

import { z } from 'zod'

import { businessModuleForActivityContext } from '../../../shared/modules'
import { get_activity } from '../../utils/activities/rows'
import type { AuthContext } from '../../utils/authenticate-user'
import { userCanAccessModule } from '../../utils/authorize-role'
import { communication_reference, next_status_timestamp } from '../../utils/communications/parsing'
import {
  claim_outbound_dispatch,
  CommunicationsError,
  create_outbound,
  DISPATCH_RETRY_AFTER_SECONDS,
  release_outbound_dispatch
} from '../../utils/communications/storage'
import { normalize_email } from '../../utils/contacts'
import { settle_delivery } from '../../utils/delivery-status'
import { type MailevaProduct } from '../../utils/maileva/endpoints'
import { MailevaError, singleflight } from '../../utils/maileva/http'
import { decryptMailevaSecrets } from '../../utils/maileva/secrets'
import { dispatchMaileva, type MailevaDelivery } from '../../utils/maileva/send'
import { mailevaLines, mailevaTarget, readProviders } from '../../utils/providers'

const Line = z.string().trim().max(38)
const Postal = z
  .object({
    line1: Line.optional(),
    line2: Line.optional(),
    line3: Line.optional(),
    line4: Line.optional(),
    line5: Line.optional(),
    line6: Line.min(1),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
  })
  .strict()
  .refine((address) => address.line1 || address.line2, { message: 'Adresse incomplète' })

const Electronic = z
  .object({
    email: z.email(),
    legalStatus: z.enum(['PROFESSIONAL', 'INDIVIDUAL']),
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    company: z.string().trim().min(1).max(255).optional()
  })
  .strict()

const Document = z
  .object({
    name: z.string().trim().min(1).max(255),
    mediaType: z.enum([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]),
    contentBase64: z.string().trim().min(1)
  })
  .strict()

const Content = z
  .object({
    subject: z.string().trim().min(1).max(256).optional(),
    body: z.string().trim().min(1),
    action: z.string().trim().min(1).optional()
  })
  .strict()

const Consent = z
  .object({
    reference: z.string().trim().min(1).max(255),
    grantedAt: z.iso.datetime(),
    source: z.string().trim().min(1).max(255)
  })
  .strict()

const Body = z
  .object({
    contexte: z.enum(['tickets', 'repayment']),
    ref: z.string().trim().min(1),
    destinataire: z.union([Postal, Electronic]),
    document: Document,
    consent: Consent.optional(),
    contenu: Content
  })
  .strict()

const MAX_DOCUMENT_BYTES = 10_000_000

const errorStatus = (error: CommunicationsError): 400 | 403 | 404 | 409 =>
  error.code === 'forbidden'
    ? 403
    : error.code === 'not_found'
      ? 404
      : error.code === 'conflict'
        ? 409
        : 400

export const postMaileva = (product: MailevaProduct) => async (c: AuthContext) => {
  const idempotencyKey = c.req.header('Idempotency-Key')?.trim() ?? ''
  if (!z.uuid().safeParse(idempotencyKey).success) {
    return c.json(
      { error: { code: 'invalid_idempotency_key', message: 'Idempotency-Key UUID requis' } },
      400
    )
  }
  return singleflight(`maileva-route:${idempotencyKey}`, async () => {
    const user = c.get('user')
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'invalid_body', message: 'JSON requis' } }, 400)
    }
    const parsed = Body.safeParse(body)
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
    const postal = product === 'courrier' || product === 'lrar'
    if (postal && !('line6' in parsed.data.destinataire)) {
      return c.json({ error: { code: 'invalid_body', message: 'Adresse postale requise' } }, 400)
    }
    if (!postal && !('email' in parsed.data.destinataire)) {
      return c.json(
        { error: { code: 'invalid_body', message: 'Destinataire électronique requis' } },
        400
      )
    }
    if (!userCanAccessModule(user, businessModuleForActivityContext(parsed.data.contexte))) {
      return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
    }
    const identity = 'email' in parsed.data.destinataire ? parsed.data.destinataire : null
    if (identity?.legalStatus === 'INDIVIDUAL' && (!identity.firstName || !identity.lastName)) {
      return c.json(
        { error: { code: 'invalid_body', message: 'Le particulier exige un prénom et un nom' } },
        400
      )
    }
    if (identity?.legalStatus === 'PROFESSIONAL' && !identity.company && !identity.lastName) {
      return c.json(
        {
          error: { code: 'invalid_body', message: 'Le professionnel exige une société ou un nom' }
        },
        400
      )
    }
    if (product === 'lre' && identity?.legalStatus === 'INDIVIDUAL' && !parsed.data.consent) {
      return c.json(
        {
          error: {
            code: 'invalid_body',
            message: 'La LRE vers un particulier exige une preuve de consentement'
          }
        },
        400
      )
    }
    const providers = readProviders()
    const secrets = providers.mailevaSecrets
      ? await decryptMailevaSecrets(providers.mailevaSecrets)
      : null
    const sender = mailevaLines(providers.mailevaAddress)
    if (
      !mailevaTarget(providers.mailevaUsername) ||
      !providers.mailevaClientId ||
      !secrets?.clientSecret ||
      !secrets.password ||
      (postal && (!(sender[0] || sender[1]) || !sender[5])) ||
      (!postal && !providers.mailevaSenderId) ||
      (product === 'lre' && !secrets.totpSecret)
    ) {
      return c.json(
        { error: { code: 'not_configured', message: 'Maileva n’est pas configuré' } },
        503
      )
    }
    const bytes = decodeDocument(parsed.data.document)
    if (bytes instanceof Response) return bytes
    const email = identity ? normalize_email(identity.email) : null
    if (email?.status === 'invalid') {
      return c.json({ error: { code: 'invalid_body', message: 'Email invalide' } }, 400)
    }
    const address = 'line6' in parsed.data.destinataire ? parsed.data.destinataire : null
    const delivery: MailevaDelivery = address
      ? {
          kind: 'postal',
          country: address.country,
          lines: [1, 2, 3, 4, 5, 6].map((index) => address[`line${index}` as 'line1']?.trim() ?? '')
        }
      : {
          kind: 'electronic',
          email: email?.value ?? '',
          legalStatus: identity?.legalStatus ?? 'PROFESSIONAL',
          firstName: identity?.firstName ?? '',
          lastName: identity?.lastName ?? '',
          company: identity?.company ?? ''
        }
    const destinataire = address ? deliveryLines(address).join(', ') : (email?.value ?? '')
    const sha256 = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
    try {
      const activity = create_outbound({
        actor: user.email,
        contexte: parsed.data.contexte,
        ref: parsed.data.ref,
        type: product,
        destinataire,
        contenu: JSON.stringify({
          version: 2,
          provider: 'Maileva',
          ...(parsed.data.contenu.action ? { action: parsed.data.contenu.action } : {}),
          subject: parsed.data.contenu.subject ?? parsed.data.document.name,
          body: parsed.data.contenu.body,
          document: { name: parsed.data.document.name, sha256 },
          ...(parsed.data.consent ? { consent: parsed.data.consent } : {})
        }),
        idempotency_key: idempotencyKey
      })
      const dispatch = claim_outbound_dispatch(activity.id)
      const current = get_activity(activity.id) ?? activity
      if (dispatch === 'pending') {
        c.header('Retry-After', String(DISPATCH_RETRY_AFTER_SECONDS))
        return c.json(
          {
            error: {
              code: 'dispatch_pending',
              message: 'Envoi déjà en cours, réessayez plus tard'
            },
            data: current
          },
          503
        )
      }
      if (dispatch === 'not_queued') return c.json({ data: current }, 201)
      try {
        const sendingId = await dispatchMaileva({
          activityId: activity.id,
          threadId: activity.threadId ?? communication_reference(activity.id),
          product,
          name: (parsed.data.contenu.subject ?? parsed.data.document.name).slice(0, 256),
          message: parsed.data.contenu.body,
          document: {
            name: parsed.data.document.name,
            mediaType: parsed.data.document.mediaType,
            bytes
          },
          delivery
        })
        settle_delivery({
          activity_id: activity.id,
          type: product,
          statut: 'sent',
          occurred_at: next_status_timestamp(activity),
          idempotency_key: `maileva:${sendingId}:sent`,
          id_externe: sendingId
        })
        return c.json({ data: get_activity(activity.id) ?? activity }, 201)
      } catch (error) {
        if (!(error instanceof MailevaError) || error.retryable) {
          release_outbound_dispatch(activity.id)
          if (!(error instanceof MailevaError)) console.error('[post.maileva]', product)
          c.header('Retry-After', String(DISPATCH_RETRY_AFTER_SECONDS))
          return c.json(
            {
              error: {
                code: error instanceof MailevaError ? error.code : 'provider_unavailable',
                message: error instanceof Error ? error.message : 'Échec temporaire de l’envoi'
              },
              data: activity
            },
            503
          )
        }
        const failed = settle_delivery({
          activity_id: activity.id,
          type: product,
          statut: 'failed',
          reason: error.message,
          occurred_at: next_status_timestamp(activity)
        }).activity
        return c.json({ error: { code: error.code, message: error.message }, data: failed }, 502)
      }
    } catch (error) {
      if (error instanceof CommunicationsError) {
        return c.json({ error: { code: error.code, message: error.message } }, errorStatus(error))
      }
      throw error
    }
  })
}

function decodeDocument(document: z.infer<typeof Document>): Uint8Array | Response {
  let bytes: Uint8Array
  try {
    bytes = Uint8Array.fromBase64(document.contentBase64)
  } catch {
    return Response.json(
      { error: { code: 'invalid_body', message: 'Document illisible' } },
      { status: 400 }
    )
  }
  const pdf = document.mediaType === 'application/pdf'
  const signature = pdf ? bytes.slice(0, 5) : bytes.slice(0, 2)
  const expected = pdf ? '%PDF-' : 'PK'
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_DOCUMENT_BYTES ||
    new TextDecoder().decode(signature) !== expected
  ) {
    return Response.json(
      {
        error: {
          code: 'invalid_body',
          message: 'Le document doit être un PDF ou un DOCX de 10 Mo maximum'
        }
      },
      { status: 400 }
    )
  }
  return bytes
}

function deliveryLines(address: z.infer<typeof Postal>): string[] {
  return [
    address.line1,
    address.line2,
    address.line3,
    address.line4,
    address.line5,
    address.line6,
    address.country
  ].filter((line): line is string => Boolean(line))
}

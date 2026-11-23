import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { clientAddress } from '../utils/client-address'
import { IntakesError } from '../utils/intakes/errors'
import {
  checkIntakePasswordLimit,
  checkIntakeSpeechLimit,
  checkIntakeSubmitLimit,
  recordIntakePasswordFailure
} from '../utils/intakes/rate-limit'
import { get_active_intake_by_token, has_active_intake_token } from '../utils/intakes/store'
import { record_intake_submission } from '../utils/intakes/submissions'
import { validateIntakeSubmission } from '../utils/intakes/submit'
import { name } from '../utils/setup-store'
import { speechReady } from '../utils/speech-runtime'
import { emptyPage } from '../views/empty'
import { intakePage } from '../views/intake'
import { speechBodyLimit, transcribeSpeechRequest } from './speech'

const SUBMIT_BODY_LIMIT = 26 * 1024 * 1024

export const publicIntake = new Hono()

publicIntake.get('/:token', (c) => {
  const token = c.req.param('token')
  const intake = get_active_intake_by_token(token)
  c.header('x-robots-tag', 'noindex, nofollow')
  c.header('cache-control', 'no-store')
  if (!intake) {
    return c.html(emptyPage(), 404)
  }
  return c.html(
    intakePage({
      organizationName: name(),
      intake,
      token,
      speechEnabled: speechReady(),
      initialSubmissionId: crypto.randomUUID()
    })
  )
})

publicIntake.post(
  '/:token',
  bodyLimit({
    maxSize: SUBMIT_BODY_LIMIT,
    onError: (c) =>
      c.json(
        {
          error: {
            code: 'body_too_large',
            message: 'La taille totale de votre envoi dépasse la limite autorisée (25 Mo).'
          }
        },
        413
      )
  }),
  async (c) => {
    const token = c.req.param('token')
    const intake = get_active_intake_by_token(token)
    if (!intake) {
      return c.json({ error: { code: 'not_found', message: 'Collecte introuvable.' } }, 404)
    }

    const address = clientAddress(c.req.raw)
    const submitLimit = checkIntakeSubmitLimit(address)
    if (!submitLimit.ok) {
      c.header('retry-after', String(submitLimit.retryAfter))
      return c.json(
        {
          error: {
            code: 'rate_limited',
            message: 'Trop de tentatives. Veuillez patienter avant de réessayer.'
          }
        },
        429
      )
    }

    if (intake.config.access.passwords.length > 0) {
      const passwordLimit = checkIntakePasswordLimit(address, token)
      if (!passwordLimit.ok) {
        c.header('retry-after', String(passwordLimit.retryAfter))
        return c.json(
          {
            error: {
              code: 'rate_limited',
              message: 'Trop de mots de passe incorrects. Veuillez patienter avant de réessayer.'
            }
          },
          429
        )
      }
    }

    let formData: FormData
    try {
      formData = await c.req.formData()
    } catch {
      return c.json(
        { error: { code: 'invalid_body', message: 'Formulaire multipart invalide.' } },
        400
      )
    }

    const validated = await validateIntakeSubmission(intake, formData)
    if (!validated.ok) {
      if (validated.kind === 'honeypot') {
        return c.json({ error: { code: 'rejected', message: validated.message } }, 400)
      }
      if (validated.kind === 'password_invalid') {
        recordIntakePasswordFailure(address, token)
      }
      return c.json(
        {
          error: {
            code: 'validation_error',
            message: validated.message,
            fields: validated.fields ?? {}
          }
        },
        422
      )
    }

    try {
      const recorded = record_intake_submission(intake, {
        submissionId: validated.submissionId,
        columnValues: validated.columnValues,
        files: validated.files
      })
      return c.json({ data: { id: recorded.id } }, recorded.duplicate ? 200 : 201)
    } catch (error) {
      if (error instanceof IntakesError && error.code === 'not_found') {
        return c.json({ error: { code: 'not_found', message: 'Collecte introuvable.' } }, 404)
      }
      throw error
    }
  }
)

publicIntake.post('/:token/speech', speechBodyLimit, async (c) => {
  const token = c.req.param('token')
  if (!has_active_intake_token(token)) {
    return c.json({ error: { code: 'not_found', message: 'Collecte introuvable.' } }, 404)
  }

  const limit = checkIntakeSpeechLimit(clientAddress(c.req.raw))
  if (!limit.ok) {
    c.header('retry-after', String(limit.retryAfter))
    return c.json(
      {
        error: {
          code: 'rate_limited',
          message: 'Trop de dictées successives. Veuillez patienter.'
        }
      },
      429
    )
  }

  return transcribeSpeechRequest(c)
})

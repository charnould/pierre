import type { Context } from 'hono'
import { Hono } from 'hono'
import { z } from 'zod'

import type { ActivityListItem } from '../../shared/activities'
import { parseTaskContent } from '../../shared/activity-content'
import { readRepaymentForms } from '../../shared/repayment-plan'
import { list_activities } from '../utils/activities/query'
import { build_rattachement } from '../utils/activities/rows'
import { authenticate, type AuthEnv } from '../utils/authenticate-user'
import { authorizeModule } from '../utils/authorize-role'
import { list_ledger_movements } from '../utils/ledger/query'
import {
  renderRepaymentDocument,
  RepaymentDocumentError,
  RepaymentDocumentRequestSchema
} from '../utils/repayment-documents'
import { readSetupBytes } from '../utils/setup-store'

const RepaymentTimelineQuery = z
  .object({
    id_locataire: z.string().trim().min(1).max(256)
  })
  .strict()

const parse_query = (url: string) => {
  const params = new URL(url).searchParams
  if (
    params.getAll('id_locataire').length !== 1 ||
    [...params.keys()].some((key) => key !== 'id_locataire')
  ) {
    return null
  }
  const parsed = RepaymentTimelineQuery.safeParse({
    id_locataire: params.get('id_locataire')
  })
  return parsed.success ? parsed.data : null
}

const open_actions = (activities: ActivityListItem[]): ActivityListItem[] => {
  const heads = new Map<string, ActivityListItem>()
  for (const activity of activities) {
    if (!activity.type.startsWith('task.') || !activity.threadId) continue
    const current = heads.get(activity.threadId)
    if (!current || (activity.revision ?? 0) > (current.revision ?? 0)) {
      heads.set(activity.threadId, activity)
    }
  }
  return [...heads.values()].filter(
    (activity) => parseTaskContent(activity.contenu)?.task.state === 'open'
  )
}

export const listRepayment = (c: Context<AuthEnv>) => {
  const user = c.get('user')

  const query = parse_query(c.req.url)
  if (!query) {
    return c.json(
      { error: { code: 'invalid_query', message: 'A single id_locataire is required' } },
      400
    )
  }

  const { id_locataire } = query
  let movements: Record<string, unknown>[] = []
  let notifications: ActivityListItem[] = []
  let openActionEvents: ActivityListItem[] = []
  const errors = {
    movements: false,
    notifications: false,
    openActions: false
  }

  try {
    movements = list_ledger_movements(id_locataire).data
  } catch {
    errors.movements = true
  }
  try {
    notifications = list_activities(user.email, {
      rattachement: build_rattachement('repayment', id_locataire),
      all: true
    })
    openActionEvents = open_actions(notifications)
  } catch {
    errors.notifications = true
    errors.openActions = true
  }

  return c.json({
    data: { movements, notifications, openActionEvents },
    errors
  })
}

export const exportRepaymentDocument = async (c: Context<AuthEnv>) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Dossier illisible.' } }, 400)
  }
  const parsed = RepaymentDocumentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Dossier illisible.' } }, 400)
  }
  const forms = readRepaymentForms(parsed.data.dossier)
  if (!forms.ok) {
    return c.json({ error: { code: 'invalid_body', message: 'Dossier illisible.' } }, 400)
  }
  const template = readSetupBytes(`repayment/${parsed.data.document}.docx`)
  if (!template) {
    return c.json(
      { error: { code: 'missing_template', message: 'Déposez le modèle Word correspondant.' } },
      400
    )
  }
  try {
    const rendered = await renderRepaymentDocument({
      document: parsed.data.document,
      format: parsed.data.format,
      dossier: forms.value,
      template,
      email: c.get('user').email
    })
    const copy = new ArrayBuffer(rendered.bytes.byteLength)
    new Uint8Array(copy).set(rendered.bytes)
    return new Response(new Blob([copy]), {
      headers: {
        'content-type': rendered.mimeType,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(rendered.filename)}`
      }
    })
  } catch (error) {
    if (error instanceof RepaymentDocumentError) {
      return c.json({ error: { code: 'invalid_template', message: error.message } }, 400)
    }
    throw error
  }
}

export const repayment = new Hono<AuthEnv>()

repayment.get('/', authenticate, authorizeModule('repayment'), listRepayment)
repayment.post('/documents', authenticate, authorizeModule('repayment'), exportRepaymentDocument)

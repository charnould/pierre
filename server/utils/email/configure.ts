import { moduleEmailFrom } from '../setup-store'
import {
  mailgun_api,
  mailgun_callback_origin,
  mailgun_env_started,
  mailgun_failure,
  mailgun_form,
  mailgun_signing_key,
  type MailgunApi,
  type MailgunFormResult
} from './mailgun'

const EVENTS = ['accepted', 'delivered', 'opened', 'permanent_fail'] as const
const ROUTE_DESCRIPTION = 'PIERRE inbound'

const escape_regex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Adresses d’expédition des modules. */
export const inbound_route_expression = (domain: string, addresses: string[]): string => {
  const unique = [
    ...new Set(
      addresses
        .map((address) => address.trim().toLowerCase())
        .filter((address) => address.endsWith(`@${domain}`))
    )
  ]
  if (unique.length === 0) return `match_recipient("^.*@${escape_regex(domain)}$")`
  return unique.map((address) => `match_recipient("^${escape_regex(address)}$")`).join(' or ')
}

const require_ok = (action: string, result: MailgunFormResult): void => {
  if (!result.ok) throw mailgun_failure(action, result)
}

const domain_path = (api: MailgunApi, suffix: string): string =>
  `/v3/domains/${encodeURIComponent(api.domain)}${suffix}`

const ensure_open_tracking = async (api: MailgunApi): Promise<boolean> => {
  const current = await mailgun_form(api, 'GET', domain_path(api, '/tracking'))
  require_ok('lecture du suivi', current)
  const open = (current.json as { tracking?: { open?: { active?: unknown } } } | null)?.tracking
    ?.open?.active
  if (open === true || open === 'yes') return false
  const updated = await mailgun_form(api, 'PUT', domain_path(api, '/tracking/open'), {
    active: 'yes'
  })
  require_ok('activation du suivi d’ouverture', updated)
  return true
}

const ensure_event_webhooks = async (api: MailgunApi, url: string): Promise<boolean> => {
  const listed = await mailgun_form(api, 'GET', domain_path(api, '/webhooks'))
  require_ok('lecture des webhooks', listed)
  const webhooks =
    (listed.json as { webhooks?: Record<string, { urls?: string[] }> } | null)?.webhooks ?? {}
  let changed = false
  for (const event of EVENTS) {
    const urls = webhooks[event]?.urls ?? []
    if (urls.length === 1 && urls[0] === url) continue
    if (urls.length === 0) {
      const created = await mailgun_form(api, 'POST', domain_path(api, '/webhooks'), {
        id: event,
        url
      })
      require_ok(`webhook ${event}`, created)
    } else {
      const updated = await mailgun_form(api, 'PUT', domain_path(api, `/webhooks/${event}`), {
        url
      })
      require_ok(`webhook ${event}`, updated)
    }
    changed = true
  }
  return changed
}

type MailgunRoute = {
  id?: string
  description?: string
  expression?: string
  actions?: string[]
}

const find_route = async (api: MailgunApi): Promise<MailgunRoute | null> => {
  for (let skip = 0; skip < 1000; skip += 100) {
    const page = await mailgun_form(api, 'GET', `/v3/routes?limit=100&skip=${skip}`)
    require_ok('lecture des routes', page)
    const items = (page.json as { items?: MailgunRoute[] } | null)?.items ?? []
    const found = items.find((item) => item.description === ROUTE_DESCRIPTION)
    if (found) return found
    if (items.length < 100) return null
  }
  return null
}

const ensure_inbound_route = async (api: MailgunApi, url: string): Promise<boolean> => {
  const expression = inbound_route_expression(api.domain, [
    moduleEmailFrom('tickets') ?? '',
    moduleEmailFrom('repayment') ?? ''
  ])
  const actions = [`forward("${url}")`, 'stop()']
  const existing = await find_route(api)
  if (
    existing?.expression === expression &&
    JSON.stringify(existing.actions ?? []) === JSON.stringify(actions)
  ) {
    return false
  }
  const fields = {
    priority: '0',
    description: ROUTE_DESCRIPTION,
    expression,
    action: actions
  }
  if (existing?.id) {
    const updated = await mailgun_form(
      api,
      'PUT',
      `/v3/routes/${encodeURIComponent(existing.id)}`,
      fields
    )
    require_ok('mise à jour de la route', updated)
  } else {
    const created = await mailgun_form(api, 'POST', '/v3/routes', fields)
    require_ok('création de la route', created)
  }
  return true
}

/** Enregistre le suivi d’ouverture, les webhooks d’événements et la route de réception. */
export async function configure_mailgun(): Promise<void> {
  const read = mailgun_api()
  const signingKey = mailgun_signing_key()
  if (!read.ok || !signingKey) {
    if (mailgun_env_started()) {
      console.error(`[sinch] ${!read.ok ? read.message : 'SINCH_WEBHOOK_SIGNING_KEY manquant'}`)
    }
    return
  }
  const origin = mailgun_callback_origin()
  if (!origin) {
    console.error('[sinch] HOST https public manquant, webhooks non enregistrés')
    return
  }
  const changed = [
    await ensure_event_webhooks(read.api, `${origin}/webhook/email`),
    await ensure_inbound_route(read.api, `${origin}/webhook/email/inbound`),
    await ensure_open_tracking(read.api)
  ].some(Boolean)
  if (changed) console.log(`[sinch] webhooks enregistrés sur ${origin}`)
}

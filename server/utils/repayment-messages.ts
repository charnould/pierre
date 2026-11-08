import { parse_choices } from '../../shared/rcs-message'
import { type RepaymentMessage, repaymentMessageKey } from '../../shared/repayment-messages'

export class RepaymentMessageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RepaymentMessageError'
  }
}

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const RCS_KEYS = ['group', 'action', 'label', 'body', 'sms_fallback', 'choices'] as const
const EMAIL_KEYS = ['group', 'action', 'to', 'label', 'subject', 'email'] as const

function fail(path: string, message: string): never {
  throw new RepaymentMessageError(path ? `${path} : ${message}` : message)
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'texte requis.')
  return value.trim()
}

function only(record: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) fail(path ? `${path}.${key}` : key, 'clé inconnue.')
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function parseRcs(raw: string): RepaymentMessage {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    fail('', 'JSON invalide.')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('', 'objet JSON requis.')
  const record = data as Record<string, unknown>
  only(record, RCS_KEYS, '')
  const group = text(record['group'], 'group')
  const action = text(record['action'], 'action')
  const label = text(record['label'], 'label')
  const body = text(record['body'], 'body')
  const choices = parse_choices(record['choices'])
  if (!choices) fail('choices', 'invalides.')
  const fallback = record['sms_fallback']
  if (fallback != null && (typeof fallback !== 'string' || !fallback.trim())) {
    fail('sms_fallback', 'texte requis.')
  }
  return {
    kind: 'rcs',
    group,
    action,
    label,
    body,
    sms_fallback: typeof fallback === 'string' && fallback.trim() ? fallback.trim() : body,
    choices
  }
}

function frontmatter(raw: string): { fields: Map<string, string>; body: string } {
  const match = raw.match(FRONTMATTER)
  if (!match) fail('', 'frontmatter requis.')
  const fields = new Map<string, string>()
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue
    const sep = line.indexOf(':')
    if (sep <= 0) fail('', 'frontmatter illisible.')
    const key = line.slice(0, sep).trim()
    if (fields.has(key)) fail(key, 'en double.')
    fields.set(key, unquote(line.slice(sep + 1).trim()))
  }
  for (const key of fields.keys()) {
    if (!EMAIL_KEYS.includes(key as (typeof EMAIL_KEYS)[number])) fail(key, 'clé inconnue.')
  }
  return {
    fields,
    body: raw
      .slice(match[0].length)
      .replace(/^\r?\n/, '')
      .trim()
  }
}

function field(fields: Map<string, string>, key: string): string {
  return text(fields.get(key), key)
}

function parseEmail(raw: string): RepaymentMessage {
  const { fields, body } = frontmatter(raw)
  const group = field(fields, 'group')
  const action = field(fields, 'action')
  const label = field(fields, 'label')
  const subject = field(fields, 'subject')
  const message = text(body, 'corps')
  const to = field(fields, 'to')
  if (to !== 'locataire' && to !== 'caf') fail('to', 'locataire ou caf requis.')
  const email = fields.get('email')?.trim() ?? ''
  if (to === 'locataire' && email) fail('email', 'interdit.')
  if (to === 'caf' && !EMAIL_ADDRESS.test(email)) fail('email', 'adresse requise.')
  return {
    kind: 'email',
    to,
    group,
    action,
    label,
    subject,
    body: message,
    email: to === 'caf' ? email : null
  }
}

export function parseRepaymentMessage(raw: string): RepaymentMessage {
  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text) fail('', 'texte requis.')
  return text.startsWith('{') ? parseRcs(text) : parseEmail(text)
}

export function parseRepaymentMessages(raw: string): RepaymentMessage[] {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    fail('messages', 'JSON invalide.')
  }
  if (!Array.isArray(data) || data.length === 0) fail('messages', 'requis.')
  const messages: RepaymentMessage[] = []
  const seen = new Set<string>()
  for (const [index, entry] of data.entries()) {
    if (typeof entry !== 'string' || !entry.trim()) fail(`messages[${index}]`, 'texte requis.')
    let message: RepaymentMessage
    try {
      message = parseRepaymentMessage(entry)
    } catch (error) {
      const detail = error instanceof RepaymentMessageError ? error.message : 'invalide.'
      fail('', `Message ${index + 1} · ${detail}`)
    }
    const key = repaymentMessageKey(message)
    if (seen.has(key)) {
      fail('', `Message ${index + 1} · « ${message.group} · ${message.label} » en double.`)
    }
    seen.add(key)
    messages.push(message)
  }
  return messages
}

export function sortRepaymentMessages(messages: readonly RepaymentMessage[]): RepaymentMessage[] {
  return [...messages].sort((a, b) => {
    const group = a.group.localeCompare(b.group, 'fr')
    return group || a.label.localeCompare(b.label, 'fr')
  })
}

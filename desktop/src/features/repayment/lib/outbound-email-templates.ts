import type { TenantRepaymentRow } from './classify-tenants'

export type OutboundEmailRecipient = 'caf' | 'locataire'

type OutboundMailChannel = 'email' | 'mailto'

export type OutboundEmailTemplate = {
  channel: OutboundMailChannel
  id: string
  group: string
  action: string
  to: OutboundEmailRecipient
  label: string
  subject: string
  body: string
  /** Destinataire CAF (frontmatter `email`) ; ignoré pour `to: locataire`. */
  email: string | null
}

export type OutboundRcsTemplate = {
  channel: 'rcs'
  id: string
  group: string
  action: string
  label: string
  body: string
}

export type OutboundTemplate = OutboundEmailTemplate | OutboundRcsTemplate

export type OutboundTemplateGroup = {
  group: string
  templates: OutboundTemplate[]
}

export type OutboundEmailResolved = {
  templateId: string
  to: OutboundEmailRecipient
  toAddress: string
  subject: string
  body: string
  /** `mailto:` — ouvre le client mail par défaut du système. */
  mailtoUrl: string
}

export type OutboundRcsResolved = {
  templateId: string
  body: string
}

const PLACEHOLDER_KEYS = ['id_locataire', 'id_client', 'email_client', 'telephone_client'] as const

type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number]

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Identifiant technique : snake_case, stable (indépendant du nom de fichier / label). */
const TEMPLATE_ID_RE = /^[a-z][a-z0-9_]*$/

function readFrontmatterValue(block: string, key: string): string | null {
  const match = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  if (!match) return null
  const raw = (match[1] ?? '').trim()
  if (!raw) return null
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  return raw
}

function tenantField(tenant: TenantRepaymentRow, key: PlaceholderKey): string {
  const value = tenant[key]
  if (value == null) return ''
  return String(value).trim()
}

function applyPlaceholders(text: string, tenant: TenantRepaymentRow): string {
  return text.replace(/\{\{(\w+)\}\}/g, (full, key: string) => {
    if ((PLACEHOLDER_KEYS as readonly string[]).includes(key)) {
      return tenantField(tenant, key as PlaceholderKey)
    }
    return full
  })
}

/** Parse un fichier markdown template repayment. Retourne null si invalide. */
export function parseOutboundTemplate(raw: string): OutboundTemplate | null {
  const trimmed = raw.replace(/^\uFEFF/, '')
  const fmMatch = trimmed.match(FRONTMATTER_RE)
  if (!fmMatch) return null

  const frontmatter = fmMatch[1] ?? ''
  const body = trimmed
    .slice(fmMatch[0].length)
    .replace(/^\r?\n/, '')
    .trimEnd()

  const id = readFrontmatterValue(frontmatter, 'id')
  if (!id || !TEMPLATE_ID_RE.test(id)) return null

  const channel = readFrontmatterValue(frontmatter, 'channel')
  const label = readFrontmatterValue(frontmatter, 'label')
  const group = readFrontmatterValue(frontmatter, 'group')
  const action = readFrontmatterValue(frontmatter, 'action')
  if (!label || !group || !action) return null

  if (channel === 'rcs') {
    return { channel: 'rcs', id, group, action, label, body }
  }

  if (channel !== 'email' && channel !== 'mailto') return null

  const toRaw = readFrontmatterValue(frontmatter, 'to')
  if (toRaw !== 'caf' && toRaw !== 'locataire') return null

  const subject = readFrontmatterValue(frontmatter, 'subject')
  if (!subject) return null

  return {
    channel,
    id,
    group,
    action,
    to: toRaw,
    label,
    subject,
    body,
    email: readFrontmatterValue(frontmatter, 'email')
  }
}

export function resolveOutboundEmail(
  template: OutboundEmailTemplate,
  tenant: TenantRepaymentRow
): OutboundEmailResolved {
  const subject = applyPlaceholders(template.subject, tenant)
  const body = applyPlaceholders(template.body, tenant)
  const toAddress =
    template.to === 'caf' ? (template.email?.trim() ?? '') : tenantField(tenant, 'email_client')

  const safeTo = toAddress.replace(/[<>"]/g, '')
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  const mailtoUrl = `mailto:${safeTo}${params.length > 0 ? `?${params.join('&')}` : ''}`

  return { templateId: template.id, to: template.to, toAddress: safeTo, subject, body, mailtoUrl }
}

export function resolveOutboundRcs(
  template: OutboundRcsTemplate,
  tenant: TenantRepaymentRow
): OutboundRcsResolved {
  return { templateId: template.id, body: applyPlaceholders(template.body, tenant) }
}

export function templatesFromRawModules(rawModules: Record<string, string>): OutboundTemplate[] {
  const templates: OutboundTemplate[] = []
  const seenIds = new Set<string>()
  for (const raw of Object.values(rawModules)) {
    if (typeof raw !== 'string') continue
    const parsed = parseOutboundTemplate(raw)
    if (!parsed) continue
    if (seenIds.has(parsed.id)) continue
    seenIds.add(parsed.id)
    templates.push(parsed)
  }
  return templates.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

function sortByFrLabel<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

/** Rubriques du menu. `groupOrder` vide / absent = alpha `fr`. Hors liste = à la fin, alpha. */
export function groupOutboundTemplates(
  templates: readonly OutboundTemplate[],
  groupOrder?: readonly string[]
): OutboundTemplateGroup[] {
  const byGroup = new Map<string, OutboundTemplate[]>()
  for (const template of templates) {
    const list = byGroup.get(template.group)
    if (list) list.push(template)
    else byGroup.set(template.group, [template])
  }

  const seen = new Set<string>()
  const groups: OutboundTemplateGroup[] = []
  const order = (groupOrder ?? []).map((name) => name.trim()).filter((name) => name.length > 0)

  for (const name of order) {
    if (seen.has(name)) continue
    const items = byGroup.get(name)
    if (!items?.length) continue
    seen.add(name)
    groups.push({ group: name, templates: sortByFrLabel(items) })
  }

  const rest = [...byGroup.keys()]
    .filter((name) => !seen.has(name))
    .sort((a, b) => a.localeCompare(b, 'fr'))
  for (const name of rest) {
    const items = byGroup.get(name)
    if (!items) continue
    groups.push({ group: name, templates: sortByFrLabel(items) })
  }

  return groups
}

export function filterOutboundEmailTemplates(
  templates: readonly OutboundTemplate[],
  to: OutboundEmailRecipient
): OutboundEmailTemplate[] {
  return templates.filter(
    (template): template is OutboundEmailTemplate =>
      (template.channel === 'email' || template.channel === 'mailto') && template.to === to
  )
}

export function filterOutboundRcsTemplates(
  templates: readonly OutboundTemplate[]
): OutboundRcsTemplate[] {
  return templates.filter((template): template is OutboundRcsTemplate => template.channel === 'rcs')
}

export function findOutboundTemplateById(
  templates: readonly OutboundTemplate[],
  id: string
): OutboundTemplate | null {
  return templates.find((template) => template.id === id) ?? null
}

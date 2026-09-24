import { Database } from 'bun:sqlite'

import { format } from 'oxfmt'

import { TRACE_MODES } from '../../shared/chat'
import { validateExternalApplication } from '../../shared/external-application'
import { datastorePaths } from './paths'

const CHATBOT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/
const TEMPLATE_NAME = /^[a-z0-9][a-z0-9._-]{0,80}\.(md|json)$/
const PLAN_CLOSE = [
  'execution_complete',
  'non_respect',
  'remplacement_par_nouveau_plan',
  'effacement_de_dette'
] as const
const EMAIL_FIELDS = ['logo_inline_cid', 'message'] as const

export class SetupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SetupError'
  }
}

type Row = { id: string; content: Uint8Array }

const open = (): Database => {
  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
  return db
}

const textOf = (content: Uint8Array): string => new TextDecoder().decode(content)

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text)

function readRow(id: string): Uint8Array | null {
  const db = open()
  try {
    const row = db.query<Row, [string]>('SELECT id, content FROM setup WHERE id = ?').get(id)
    return row ? new Uint8Array(row.content) : null
  } finally {
    db.close()
  }
}

function readText(id: string): string | null {
  const content = readRow(id)
  return content ? textOf(content) : null
}

function writeRow(id: string, content: Uint8Array): void {
  const db = open()
  try {
    db.run(
      'INSERT INTO setup (id, content) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content',
      [id, content]
    )
  } finally {
    db.close()
  }
}

function listIds(prefix: string): string[] {
  const db = open()
  try {
    return db
      .query<{ id: string }, [string]>('SELECT id FROM setup WHERE id LIKE ? ORDER BY id')
      .all(`${prefix}%`)
      .map((row) => row.id)
  } finally {
    db.close()
  }
}

async function formatText(filename: string, source: string): Promise<string> {
  const formatted = await format(filename, source)
  if (formatted.errors.length > 0) {
    throw new SetupError(formatted.errors.map((error) => error.message).join('\n'))
  }
  return formatted.code
}

function objectOf(text: string): any {
  const value = JSON.parse(text) as unknown
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new SetupError('JSON objet requis.')
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new SetupError(`${label} requis.`)
  return value.trim()
}

function requireStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new SetupError(`${label} requis.`)
  return value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new SetupError(`${label}[${index}] requis.`)
    }
    return entry.trim()
  })
}

function buckets(
  value: unknown,
  required: readonly string[],
  namespace: string
): { id: string; label: string }[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new SetupError(`${namespace}.buckets requis.`)
  const seen = new Set<string>()
  const rows = value.map((entry, index) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new SetupError(`${namespace}.buckets[${index}] requis.`)
    }
    const row = entry as { id?: unknown; label?: unknown }
    const id = requireString(row.id, `${namespace}.buckets[${index}].id`)
    const label = requireString(row.label, `${namespace}.buckets[${index}].label`)
    if (seen.has(id)) throw new SetupError(`${namespace}.buckets id en double.`)
    seen.add(id)
    return { id, label }
  })
  for (const id of required) {
    if (!seen.has(id)) throw new SetupError(`${namespace}.buckets « ${id} » requis.`)
  }
  return rows
}

function labels(value: unknown, label: string): string[] {
  return requireStringList(value, label)
}

function isIana(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function chatbotFields(root: any, id: string): any {
  if (root.id !== id) throw new SetupError('id incohérent.')
  requireString(root.display, 'display')
  if (typeof root.community_knowledge !== 'boolean')
    throw new SetupError('community_knowledge requis.')
  if (typeof root.attachments !== 'boolean') throw new SetupError('attachments requis.')
  if (!['low', 'medium', 'high'].includes(String(root.reasoning_effort))) {
    throw new SetupError('reasoning_effort requis.')
  }
  if (!(TRACE_MODES as readonly string[]).includes(String(root.trace)))
    throw new SetupError('trace requis.')
  requireStringList(root.greetings, 'greetings')
  requireStringList(root.examples, 'examples')
  requireString(root.disclaimer, 'disclaimer')
  if ('instructions' in root || 'prompt' in root) throw new SetupError('consigne hors du JSON.')
  return root
}

function parseTickets(root: any): any {
  buckets(root.buckets, ['non_traitees'], 'tickets')
  const actions = root.actions
  if (actions == null || typeof actions !== 'object' || Array.isArray(actions)) {
    throw new SetupError('tickets.actions requis.')
  }
  labels((actions as { dossier?: unknown }).dossier, 'tickets.actions.dossier')
  labels(root.tags, 'tickets.tags')
  if ('prompt' in root) throw new SetupError('consigne hors du JSON.')
  if ('external_application' in root && root.external_application != null) {
    const errors = validateExternalApplication(
      root.external_application,
      'tickets.external_application'
    )
    if (errors.length > 0) throw new SetupError(errors.join('\n'))
  }
  return root
}

function parseRepayment(root: any): any {
  const rows = buckets(root.buckets, ['non_traites', 'clients_partis'], 'repayment')
  const ids = new Set(rows.map((row) => row.id))
  const actions = root.actions
  if (actions == null || typeof actions !== 'object' || Array.isArray(actions)) {
    throw new SetupError('repayment.actions requis.')
  }
  const actionRows = actions as { dossier?: unknown; bulk_operations?: unknown }
  labels(actionRows.dossier, 'repayment.actions.dossier')
  labels(actionRows.bulk_operations, 'repayment.actions.bulk_operations')
  labels(root.tags, 'repayment.tags')
  requireStringList(root.template_groups, 'repayment.template_groups')
  const templates = requireStringList(root.templates, 'repayment.templates')
  for (const name of templates) {
    if (!TEMPLATE_NAME.test(name)) throw new SetupError(`modèle « ${name} » invalide.`)
  }
  if ('prompt' in root) throw new SetupError('consigne hors du JSON.')
  const plan = root.create_plan
  if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new SetupError('repayment.create_plan requis.')
  }
  const signed = requireString(
    (plan as { signed_bucket_id?: unknown }).signed_bucket_id,
    'signed_bucket_id'
  )
  if (!ids.has(signed)) throw new SetupError('signed_bucket_id inconnu.')
  const close = (plan as { close?: unknown }).close
  if (close == null || typeof close !== 'object' || Array.isArray(close)) {
    throw new SetupError('repayment.create_plan.close requis.')
  }
  const closeRows = close as Record<string, unknown>
  for (const motif of PLAN_CLOSE) {
    const entry = closeRows[motif]
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new SetupError(`close.${motif} requis.`)
    }
    const bucketId = requireString((entry as { bucket_id?: unknown }).bucket_id, `close.${motif}`)
    if (!ids.has(bucketId)) throw new SetupError(`close.${motif} inconnu.`)
  }
  for (const key of Object.keys(closeRows)) {
    if (!(PLAN_CLOSE as readonly string[]).includes(key))
      throw new SetupError(`motif « ${key} » inconnu.`)
  }
  return root
}

function parseGlobal(root: any): { name: string; timezone: string } {
  const name = requireString(root.name, 'name')
  const timezone = requireString(root.timezone, 'timezone')
  if (!isIana(timezone)) throw new SetupError('fuseau IANA requis.')
  return { name, timezone }
}

const AGENTS_MD =
  /^(?:about|automations|tickets|repayment)\/AGENTS\.md$|^chatbots\/[a-z0-9][a-z0-9_-]{0,63}\/AGENTS\.md$/

function agentsText(id: string): string | null {
  const text = readText(id)?.trim()
  return text ? text : null
}

function parseDefaultChatbot(root: any): any {
  chatbotFields(root, 'default')
  if (typeof root.enabled !== 'boolean') throw new SetupError('enabled requis.')
  if ('custom_data' in root) throw new SetupError('custom_data retiré.')
  return root
}

function parseInternalChatbot(root: any, id: string): any {
  chatbotFields(root, id)
  if ('enabled' in root || 'custom_data' in root) throw new SetupError('champ public interdit.')
  return root
}

function jsonText(id: string): any | null {
  const text = readText(id)
  if (!text) return null
  try {
    return objectOf(text)
  } catch {
    return null
  }
}

export function repaymentTemplateIds(root: any): string[] {
  return Array.isArray(root.templates)
    ? root.templates.filter((name: unknown) => typeof name === 'string')
    : []
}

export function ticketsReady(): any | null {
  const root = jsonText('tickets')
  if (!root) return null
  try {
    parseTickets(root)
  } catch {
    return null
  }
  if (!readRow('tickets/letter.docx')) return null
  if (!agentsText('tickets/AGENTS.md')) return null
  return root
}

export function repaymentReady(): any | null {
  const root = jsonText('repayment')
  if (!root) return null
  try {
    parseRepayment(root)
  } catch {
    return null
  }
  if (!readRow('repayment/template.docx')) return null
  if (!agentsText('repayment/AGENTS.md')) return null
  for (const name of repaymentTemplateIds(root)) {
    if (!readText(`repayment/templates/${name}`)?.trim()) return null
  }
  return root
}

export function aboutReady(): { prompt: string } | null {
  const prompt = agentsText('about/AGENTS.md')
  return prompt ? { prompt } : null
}

export function automationsReady(): { prompt: string } | null {
  const prompt = agentsText('automations/AGENTS.md')
  return prompt ? { prompt } : null
}

export function globalReady(): boolean {
  const root = jsonText('global')
  if (!root) return false
  try {
    parseGlobal(root)
    return true
  } catch {
    return false
  }
}

export function emailReady(): boolean {
  const html = readText('email/html') ?? ''
  if (!html.trim() || EMAIL_FIELDS.some((field) => !html.includes(`{{ ${field} }}`))) return false
  const logo = readRow('email/logo.png')
  return logo != null && logo.byteLength > 0
}

export function defaultChatbotReady(): any | null {
  const root = jsonText('chatbots/default')
  if (!root) return null
  try {
    parseDefaultChatbot(root)
  } catch {
    return null
  }
  const icon = readText('chatbots/icons/icon.svg') ?? ''
  if (!icon.includes('<svg')) return null
  if (!agentsText('chatbots/default/AGENTS.md')) return null
  return root
}

export function name(): string {
  const value = jsonText('global')?.name
  return typeof value === 'string' && value.trim() ? value.trim() : 'PIERRE'
}

export function timezone(): string | null {
  const value = jsonText('global')?.timezone
  return typeof value === 'string' && isIana(value.trim()) ? value.trim() : null
}

export function internalChatbot(id: string): any | null {
  if (id === 'default' || !CHATBOT_ID.test(id)) return null
  const root = jsonText(`chatbots/${id}`)
  if (!root) return null
  try {
    parseInternalChatbot(root, id)
    if (!agentsText(`chatbots/${id}/AGENTS.md`)) return null
    return root
  } catch {
    return null
  }
}

export function listChatbots(): Array<{ id: string; display: string }> {
  return listIds('chatbots/')
    .filter((rowId) => /^chatbots\/[a-z0-9][a-z0-9_-]{0,63}$/.test(rowId))
    .flatMap((rowId) => {
      const id = rowId.slice('chatbots/'.length)
      const config = id === 'default' ? jsonText('chatbots/default') : internalChatbot(id)
      return config ? [{ id, display: String(config.display) }] : []
    })
    .sort((a, b) => a.display.localeCompare(b.display, 'fr'))
}

export function listInternalChatbots(): Array<{ id: string; display: string }> {
  return listChatbots().filter((chatbot) => chatbot.id !== 'default')
}

export function skillPrompt(id: string): string | null {
  if (id === 'about') return aboutReady()?.prompt ?? null
  if (id === 'report') return automationsReady()?.prompt ?? null
  if (id === 'replies') return ticketsReady() ? agentsText('tickets/AGENTS.md') : null
  if (id === 'repayment') return repaymentReady() ? agentsText('repayment/AGENTS.md') : null
  return null
}

export function chatbotAgents(id: string): string {
  return readText(`chatbots/${id}/AGENTS.md`)?.trim() ?? ''
}

export function readSetupBytes(id: string): Uint8Array | null {
  return readRow(id)
}

export function repaymentTemplates(): Record<string, string> {
  const root = repaymentReady()
  if (!root) return {}
  const templates: Record<string, string> = {}
  for (const name of repaymentTemplateIds(root)) {
    const text = readText(`repayment/templates/${name}`)
    if (text) templates[name] = text
  }
  return templates
}

const PHONE_ICONS = [
  ['chatbots/icons/apple-touch-icon.png', 180],
  ['chatbots/icons/icon-192.png', 192],
  ['chatbots/icons/icon-512.png', 512]
] as const

async function writePhoneIcons(svg: string): Promise<void> {
  for (const [id, size] of PHONE_ICONS) {
    const proc = Bun.spawn(
      ['magick', '-background', 'none', 'svg:-', '-resize', `${size}x${size}`, 'png:-'],
      { stdin: new Blob([svg]), stdout: 'pipe', stderr: 'pipe' }
    )
    const bytes = new Uint8Array(await new Response(proc.stdout).arrayBuffer())
    const code = await proc.exited
    if (code !== 0 || bytes.byteLength === 0) throw new SetupError('icône illisible.')
    writeRow(id, bytes)
  }
}

export async function writeSetup(id: string, content: Uint8Array): Promise<void> {
  if (id === 'email/html') {
    const html = textOf(content)
    if (!html.trim() || EMAIL_FIELDS.some((field) => !html.includes(`{{ ${field} }}`))) {
      throw new SetupError('gabarit de courriel incomplet.')
    }
    writeRow(id, bytesOf(html))
    return
  }
  if (id === 'email/logo.png') {
    if (content.byteLength < 8 || content[0] !== 0x89 || content[1] !== 0x50) {
      throw new SetupError('logo.png requis.')
    }
    writeRow(id, content)
    return
  }
  if (id === 'tickets/letter.docx' || id === 'repayment/template.docx') {
    if (content.byteLength < 4 || content[0] !== 0x50 || content[1] !== 0x4b) {
      throw new SetupError('docx requis.')
    }
    writeRow(id, content)
    return
  }
  if (id === 'chatbots/icons/icon.svg') {
    const svg = textOf(content)
    if (!svg.includes('<svg')) throw new SetupError('icon.svg requis.')
    writeRow(id, bytesOf(svg))
    await writePhoneIcons(svg)
    return
  }
  if (AGENTS_MD.test(id)) {
    const formatted = await formatText('AGENTS.md', textOf(content))
    if (!formatted.trim()) throw new SetupError('AGENTS.md vide.')
    writeRow(id, bytesOf(formatted))
    return
  }
  const template = id.match(/^repayment\/templates\/(.+)$/)
  if (template) {
    const name = template[1] ?? ''
    if (!TEMPLATE_NAME.test(name)) throw new SetupError('nom de modèle invalide.')
    const declared = jsonText('repayment')
    if (declared && !repaymentTemplateIds(declared).includes(name)) {
      throw new SetupError('modèle non déclaré.')
    }
    const formatted = await formatText(
      name.endsWith('.json') ? 'template.json' : 'template.md',
      textOf(content)
    )
    if (!formatted.trim()) throw new SetupError('modèle vide.')
    writeRow(id, bytesOf(formatted))
    return
  }
  if (id === 'global' || id === 'tickets' || id === 'repayment' || id.startsWith('chatbots/')) {
    const formatted = await formatText('setup.json', textOf(content))
    const root = objectOf(formatted)
    if (id === 'global') parseGlobal(root)
    else if (id === 'tickets') parseTickets(root)
    else if (id === 'repayment') parseRepayment(root)
    else if (id === 'chatbots/default') parseDefaultChatbot(root)
    else {
      const chatbotId = id.slice('chatbots/'.length)
      if (chatbotId.includes('/') || !CHATBOT_ID.test(chatbotId) || chatbotId === 'default') {
        throw new SetupError('chatbot inconnu.')
      }
      parseInternalChatbot(root, chatbotId)
    }
    writeRow(id, bytesOf(formatted))
    return
  }
  throw new SetupError('pièce inconnue.')
}

export function deleteInternalChatbot(id: string): void {
  if (id === 'default' || !CHATBOT_ID.test(id)) throw new SetupError('chatbot inconnu.')
  const db = open()
  try {
    db.run('DELETE FROM setup WHERE id = ? OR id = ?', [
      `chatbots/${id}`,
      `chatbots/${id}/AGENTS.md`
    ])
  } finally {
    db.close()
  }
}

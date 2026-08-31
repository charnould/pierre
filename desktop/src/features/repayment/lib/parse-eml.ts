import PostalMime, { type Address, type Mailbox } from 'postal-mime'

import { activity_timestamp } from '@/shared/types/activites'

export const MAX_EML_BYTES = 2 * 1024 * 1024

export type ParsedEml = {
  from: string
  to: string
  subject: string
  body: string
  sentAt: string | null
}

const QUOTE_HEADER =
  /^(?:De|From)\s*:|-{3,}\s*(?:Original Message|Message d['’]origine)\s*-{3,}|\ba écrit\s*:|\bwrote\s*:/i

function formatMailbox(entry: Mailbox): string {
  const address = entry.address.trim()
  const name = entry.name.trim()
  if (name && address) return `${name} <${address}>`
  return name || address
}

function formatAddress(entry: Address | undefined): string {
  if (!entry) return ''
  if (entry.group) return entry.group.map(formatMailbox).filter(Boolean).join(', ')
  return formatMailbox(entry)
}

function formatAddressList(list: Address[] | undefined): string {
  return (list ?? []).map(formatAddress).filter(Boolean).join(', ')
}

function isQuoteMarker(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('>')) return true
  if (/^-- $/.test(line) || line === '-- ') return true
  return QUOTE_HEADER.test(trimmed)
}

function cutQuotedHistory(text: string): string {
  const lines = text.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    if (isQuoteMarker(line)) break
    kept.push(line)
  }
  return kept.join('\n')
}

function compactText(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function htmlToPlain(html: string): string {
  if (typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('img, style, script, head').forEach((node) => node.remove())
  doc.querySelectorAll('blockquote').forEach((node) => node.remove())
  doc
    .querySelectorAll(
      '#Signature, #signature, .gmail_signature, [data-smartmail="gmail_signature"], #ms-outlook-mobile-signature'
    )
    .forEach((node) => node.remove())
  const fwd = doc.querySelector('#divRplyFwdMsg, #appendonsend')
  if (fwd) {
    let node: ChildNode | null = fwd
    while (node) {
      const next: ChildNode | null = node.nextSibling
      node.parentNode?.removeChild(node)
      node = next
    }
  }
  return doc.body?.textContent ?? ''
}

function parseSentAt(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return activity_timestamp(date)
}

function looksLikeEmlFile(file: File): boolean {
  if (file.type === 'message/rfc822') return true
  return file.name.toLowerCase().endsWith('.eml')
}

export async function parseEml(source: string | ArrayBuffer): Promise<ParsedEml | null> {
  let email
  try {
    email = await PostalMime.parse(source)
  } catch {
    return null
  }

  const from = formatAddress(email.from)
  const to = formatAddressList(email.to)
  const subject = email.subject?.trim() ?? ''
  const rawBody = email.html ? htmlToPlain(email.html) : (email.text ?? '')
  const body = compactText(cutQuotedHistory(rawBody))

  if (!subject && !body) return null

  return {
    from,
    to,
    subject,
    body,
    sentAt: parseSentAt(email.date)
  }
}

export async function parseEmlFile(file: File): Promise<ParsedEml | null> {
  if (!looksLikeEmlFile(file) || file.size > MAX_EML_BYTES) return null
  return parseEml(await file.arrayBuffer())
}

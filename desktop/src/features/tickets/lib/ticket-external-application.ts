import { getTicketCellText } from '@/shared/lib/ticket-row'
import type { TicketRow } from '@/shared/types'

const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g

export type TicketExternalApplication = {
  name: string
  urlPattern: string
  messageSelector: string
}

export function getTicketExternalApplication(config: unknown): TicketExternalApplication | null {
  if (config == null || typeof config !== 'object' || Array.isArray(config)) return null
  const application = (config as Record<string, unknown>)['external_application']
  if (application == null || typeof application !== 'object' || Array.isArray(application)) {
    return null
  }
  const value = application as Record<string, unknown>
  const name = typeof value['name'] === 'string' ? value['name'].trim() : ''
  const urlPattern = typeof value['url_pattern'] === 'string' ? value['url_pattern'].trim() : ''
  const messageSelector =
    typeof value['message_selector'] === 'string' ? value['message_selector'].trim() : ''
  if (!name || !urlPattern || !messageSelector) {
    return null
  }
  try {
    const parsed = new URL(urlPattern.replaceAll(VARIABLE_PATTERN, 'placeholder'))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  } catch {
    return null
  }
  return {
    name,
    urlPattern,
    messageSelector
  }
}

export function resolveTicketExternalApplicationUrl(
  pattern: string,
  ticket: TicketRow
): string | null {
  let missingValue = false
  const resolved = pattern.replaceAll(VARIABLE_PATTERN, (_, rawColumn: string) => {
    const value = getTicketCellText(ticket, rawColumn.trim())
    if (!value) missingValue = true
    return encodeURIComponent(value)
  })
  if (missingValue || resolved.includes('{{') || resolved.includes('}}')) return null

  try {
    const url = new URL(resolved)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

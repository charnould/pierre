export const RCS_CHOICES_MAX = 11
export const RCS_LABEL_MAX = 25

export type RcsChoice =
  | { type: 'reply'; label: string }
  | { type: 'dial'; label: string; phone: string }
  | { type: 'url'; label: string; url: string }

export type RcsContenu = {
  body: string
  choices: RcsChoice[]
  sms_fallback?: string
  action?: string
}

export type RcsComposeValue = {
  destinataire: string
  body: string
  sms_fallback: string
  choices: RcsChoice[]
}

export function empty_rcs_compose(destinataire = ''): RcsComposeValue {
  return { destinataire, body: '', sms_fallback: '', choices: [] }
}

function trim_text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

/** Shape only — no CM send limits. `legacy` keeps old `{ id, label }` replies. */
function read_choice(raw: unknown, legacy: boolean): RcsChoice | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const entry = raw as Record<string, unknown>
  const label = trim_text(entry['label'])
  if (!label) return null
  switch (entry['type']) {
    case 'reply':
      return { type: 'reply', label }
    case 'dial': {
      const phone = trim_text(entry['phone'])
      return phone ? { type: 'dial', label, phone } : null
    }
    case 'url': {
      const url = trim_text(entry['url'])
      return url ? { type: 'url', label, url } : null
    }
    case undefined:
      return legacy && trim_text(entry['id']) ? { type: 'reply', label } : null
    default:
      return null
  }
}

export function parse_choice(raw: unknown): RcsChoice | null {
  const choice = read_choice(raw, false)
  if (!choice) return null
  if ([...choice.label].length > RCS_LABEL_MAX) return null
  if (choice.type === 'url' && !choice.url.startsWith('https://')) return null
  return choice
}

export function parse_choices(raw: unknown): RcsChoice[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw) || raw.length > RCS_CHOICES_MAX) return null
  const choices: RcsChoice[] = []
  const labels = new Set<string>()
  for (const entry of raw) {
    const choice = parse_choice(entry)
    if (!choice || labels.has(choice.label)) return null
    labels.add(choice.label)
    choices.push(choice)
  }
  return choices
}

/** History: typed buttons + old `{ id, label }`. No CM send limits. */
export function parse_stored_choices(raw: unknown): RcsChoice[] | null {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return null
  const choices: RcsChoice[] = []
  for (const entry of raw) {
    const choice = read_choice(entry, true)
    if (!choice) return null
    choices.push(choice)
  }
  return choices
}

export function parse_rcs_contenu(raw: unknown): RcsContenu | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  const body = trim_text(value['body'])
  if (!body) return null
  const choices = parse_choices(value['choices'])
  if (!choices) return null
  const sms_fallback = trim_text(value['sms_fallback'])
  const action = trim_text(value['action'])
  return {
    body,
    choices,
    ...(sms_fallback ? { sms_fallback } : {}),
    ...(action ? { action } : {})
  }
}

export function with_sms_fallback(parsed: RcsContenu): RcsContenu & { sms_fallback: string } {
  return {
    body: parsed.body,
    sms_fallback: parsed.sms_fallback ?? parsed.body,
    choices: parsed.choices,
    ...(parsed.action ? { action: parsed.action } : {})
  }
}

export function rcs_compose_payload(value: RcsComposeValue): {
  destinataire: string
  contenu: RcsContenu
} | null {
  const destinataire = value.destinataire.trim()
  const parsed = parse_rcs_contenu(value)
  if (!destinataire || !parsed) return null
  return { destinataire, contenu: with_sms_fallback(parsed) }
}

export function rcs_compose_ready(value: RcsComposeValue): boolean {
  return rcs_compose_payload(value) !== null
}

import type { RcsChoice } from '../../../shared/rcs-message'
import { normalize_telephone } from '../contacts'

/** National / E.164 / `00` → format CM `00…`. Vide si ce n’est pas un mobile valide. */
export function to_cm_number(phone: string): string {
  const { value, status } = normalize_telephone(phone)
  if (status === 'invalid' || !value.startsWith('+')) return ''
  return `00${value.slice(1)}`
}

export function new_rcs_reference(): string {
  return `j${Bun.randomUUIDv7().replaceAll('-', '').slice(0, 31)}`
}

type CmSuggestion =
  | { action: 'Reply'; label: string; postbackdata: string }
  | { action: 'Dial'; label: string; postbackdata: string; dial: { PhoneNumber: string } }
  | { action: 'Openurl'; label: string; postbackdata: string; url: string }

export function to_cm_suggestions(choices: readonly RcsChoice[]): CmSuggestion[] {
  return choices.map((choice) => {
    const { label } = choice
    switch (choice.type) {
      case 'reply':
        return { action: 'Reply', label, postbackdata: label }
      case 'dial':
        return {
          action: 'Dial',
          label,
          postbackdata: label,
          dial: { PhoneNumber: choice.phone.replace(/[^\d+*#]/g, '') }
        }
      case 'url':
        return { action: 'Openurl', label, postbackdata: label, url: choice.url }
    }
  })
}

export function wrap_rcs_message(input: {
  from: string
  phone: string
  richContent: object
  body?: { content: string }
  reference: string
}): { messages: { msg: Record<string, unknown>[] } } {
  return {
    messages: {
      msg: [
        {
          from: input.from,
          to: [{ number: input.phone }],
          allowedChannels: ['RCS'],
          body: { type: 'auto', content: input.body?.content ?? '' },
          richContent: input.richContent,
          reference: input.reference
        }
      ]
    }
  }
}

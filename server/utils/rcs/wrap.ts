import { normalize_telephone } from '../contacts'

/** National / E.164 / `00` → format CM `00…`. Vide si ce n’est pas un mobile valide. */
export function to_cm_number(phone: string): string {
  const { value, status } = normalize_telephone(phone)
  if (status === 'invalid' || !value.startsWith('+')) return ''
  return `00${value.slice(1)}`
}

export function new_rcs_reference(): string {
  return `j${crypto.randomUUID().replaceAll('-', '').slice(0, 31)}`
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

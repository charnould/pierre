import { test } from 'bun:test'

import ticketConfig from '../../customization/tickets/config'

const PLACEHOLDER = '{{id_reclamation}}'

/** Throw si `customization/tickets/config.ts` n’est pas conforme. */
function assertTicketConfig(config: unknown): void {
  const errors: string[] = []

  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('ticket: config doit être un objet')
  }

  const root = config as Record<string, unknown>
  const pattern = root.ticket_url_pattern

  if (typeof pattern !== 'string' || !pattern.trim()) {
    errors.push('ticket.ticket_url_pattern: string non vide requise')
  } else if (!pattern.includes(PLACEHOLDER)) {
    errors.push(`ticket.ticket_url_pattern: doit contenir ${PLACEHOLDER}`)
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

test('ticket config.ts', () => {
  assertTicketConfig(ticketConfig)
  console.log(`✅ ticket config.ts est OK!`)
})
